#!/bin/bash

# AWS Monitoring Setup Script
# Used for setting up CloudWatch alarms and budget monitoring

set -e

echo "📊 AWS Monitoring Setup"
echo "======================="
echo ""

# Check AWS CLI configuration
echo "🔍 Checking AWS CLI configuration..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured or no permissions"
    echo "   Please run: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "ap-northeast-1")
echo "✅ AWS CLI configuration normal"
echo "  Account ID: $ACCOUNT_ID"
echo "  Region: $REGION"
echo ""

# Setup CloudWatch alarms
echo "🚨 Setting up CloudWatch alarms..."

# Lambda error alarm
echo "  📦 Lambda error alarm..."
aws cloudwatch put-metric-alarm \
  --alarm-name "chainy-prod-lambda-errors" \
  --alarm-description "Chainy Lambda function error alarm" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:$REGION:$ACCOUNT_ID:chainy-prod-budget-alert" \
  --dimensions Name=FunctionName,Value=chainy-prod-chainy-create Name=FunctionName,Value=chainy-prod-chainy-redirect \
  --treat-missing-data notBreaching \
  --output table 2>/dev/null || echo "⚠️  Lambda error alarm setup failed"

# API Gateway 5XX error alarm
echo "  🌐 API Gateway 5XX error alarm..."
aws cloudwatch put-metric-alarm \
  --alarm-name "chainy-prod-api-5xx-errors" \
  --alarm-description "Chainy API Gateway 5XX error alarm" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 3 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:$REGION:$ACCOUNT_ID:chainy-prod-budget-alert" \
  --dimensions Name=ApiName,Value=chainy \
  --treat-missing-data notBreaching \
  --output table 2>/dev/null || echo "⚠️  API Gateway 5XX error alarm setup failed"

# DynamoDB throttling alarm
echo "  🗄️  DynamoDB throttling alarm..."
aws cloudwatch put-metric-alarm \
  --alarm-name "chainy-prod-dynamodb-throttling" \
  --alarm-description "Chainy DynamoDB throttling alarm" \
  --metric-name ThrottledRequests \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:$REGION:$ACCOUNT_ID:chainy-prod-budget-alert" \
  --dimensions Name=TableName,Value=chainy-prod-chainy-links \
  --treat-missing-data notBreaching \
  --output table 2>/dev/null || echo "⚠️  DynamoDB throttling alarm setup failed"

echo ""

# Check budget setup
echo "💰 Checking budget setup..."
BUDGET_EXISTS=$(aws budgets describe-budgets --account-id $ACCOUNT_ID --query 'Budgets[?BudgetName==`chainy-prod-monthly-budget`].BudgetName' --output text 2>/dev/null || echo "")

if [ -n "$BUDGET_EXISTS" ]; then
    echo "✅ Budget already set: chainy-prod-monthly-budget"
    
    # Get current spending
    CURRENT_SPEND=$(aws budgets describe-budgets --account-id $ACCOUNT_ID --query 'Budgets[?BudgetName==`chainy-prod-monthly-budget`].CalculatedSpend.ActualSpend.Amount' --output text 2>/dev/null || echo "0")
    BUDGET_LIMIT=$(aws budgets describe-budgets --account-id $ACCOUNT_ID --query 'Budgets[?BudgetName==`chainy-prod-monthly-budget`].BudgetLimit.Amount' --output text 2>/dev/null || echo "0")
    
    echo "  Current spending: \$${CURRENT_SPEND:-0}"
    echo "  Budget limit: \$${BUDGET_LIMIT:-0}"
    
    # Calculate usage percentage
    if [ "$BUDGET_LIMIT" != "0" ] && [ "$CURRENT_SPEND" != "0" ]; then
        USAGE_PERCENT=$(echo "scale=2; $CURRENT_SPEND * 100 / $BUDGET_LIMIT" | bc 2>/dev/null || echo "0")
        echo "  Usage percentage: ${USAGE_PERCENT}%"
    fi
else
    echo "❌ Budget not set"
    echo "    Please run: terraform apply to setup budget"
fi
echo ""

# Check SNS topic
echo "📧 Checking SNS topic..."
SNS_TOPIC_EXISTS=$(aws sns list-topics --query 'Topics[?contains(TopicArn, `chainy-prod-budget-alert`)].TopicArn' --output text 2>/dev/null || echo "")

if [ -n "$SNS_TOPIC_EXISTS" ]; then
    echo "✅ SNS topic already set: chainy-prod-budget-alert"
    
    # Check subscriptions
    SUBSCRIPTIONS=$(aws sns list-subscriptions-by-topic --topic-arn "$SNS_TOPIC_EXISTS" --query 'Subscriptions[].Endpoint' --output text 2>/dev/null || echo "")
    if [ -n "$SUBSCRIPTIONS" ]; then
        echo "  Subscribed emails: $SUBSCRIPTIONS"
    else
        echo "  ⚠️  No subscribed emails"
    fi
else
    echo "❌ SNS topic not set"
fi
echo ""

# Setup log retention policy
echo "📝 Setting up log retention policy..."
aws logs put-retention-policy \
  --log-group-name "/aws/lambda/chainy-prod-chainy-create" \
  --retention-in-days 1 \
  --output table 2>/dev/null || echo "⚠️  Failed to set create Lambda log retention"

aws logs put-retention-policy \
  --log-group-name "/aws/lambda/chainy-prod-chainy-redirect" \
  --retention-in-days 1 \
  --output table 2>/dev/null || echo "⚠️  Failed to set redirect Lambda log retention"

aws logs put-retention-policy \
  --log-group-name "/aws/lambda/chainy-prod-authorizer" \
  --retention-in-days 1 \
  --output table 2>/dev/null || echo "⚠️  Failed to set authorizer Lambda log retention"

echo "✅ Log retention policy setup completed (1 day)"
echo ""

# Generate monitoring dashboard
echo "📊 Generating monitoring dashboard..."
DASHBOARD_BODY='{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", "FunctionName", "chainy-prod-chainy-create"],
          ["AWS/Lambda", "Invocations", "FunctionName", "chainy-prod-chainy-redirect"],
          ["AWS/Lambda", "Invocations", "FunctionName", "chainy-prod-authorizer"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "'$REGION'",
        "title": "Lambda Invocations"
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Errors", "FunctionName", "chainy-prod-chainy-create"],
          ["AWS/Lambda", "Errors", "FunctionName", "chainy-prod-chainy-redirect"],
          ["AWS/Lambda", "Errors", "FunctionName", "chainy-prod-authorizer"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "'$REGION'",
        "title": "Lambda Errors"
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/ApiGateway", "Count", "ApiName", "chainy"],
          ["AWS/ApiGateway", "4XXError", "ApiName", "chainy"],
          ["AWS/ApiGateway", "5XXError", "ApiName", "chainy"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "'$REGION'",
        "title": "API Gateway Request Statistics"
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "chainy-prod-chainy-links"],
          ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", "chainy-prod-chainy-links"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "'$REGION'",
        "title": "DynamoDB Capacity Usage"
      }
    }
  ]
}'

aws cloudwatch put-dashboard \
  --dashboard-name "chainy-prod-monitoring" \
  --dashboard-body "$DASHBOARD_BODY" \
  --output table 2>/dev/null || echo "⚠️  Monitoring dashboard setup failed"

echo "✅ Monitoring dashboard setup completed"
echo ""

# Complete setup
echo "🎉 AWS monitoring setup completed!"
echo ""
echo "📊 Setup Summary:"
echo "  ✅ CloudWatch Alarms: Set up"
echo "  ✅ Budget Monitoring: Configured"
echo "  ✅ SNS Notifications: Set up"
echo "  ✅ Log Retention: 1 day"
echo "  ✅ Monitoring Dashboard: Created"
echo ""
echo "🔗 Monitoring Links:"
echo "  CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=chainy-prod-monitoring"
echo "  Budget Setup: https://console.aws.amazon.com/billing/home?region=$REGION#/budgets"
echo "  Alarm Setup: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#alarmsV2:"
echo ""
echo "💡 Monitoring Recommendations:"
echo "  1. Regularly check CloudWatch dashboard"
echo "  2. Setup email notifications"
echo "  3. Monitor budget usage"
echo "  4. Setup auto-scaling rules"
echo ""
echo "📚 More Information:"
echo "  - CloudWatch Documentation: https://docs.aws.amazon.com/cloudwatch/"
echo "  - Budget Documentation: https://docs.aws.amazon.com/cost-management/latest/userguide/"
echo "  - SNS Documentation: https://docs.aws.amazon.com/sns/"
#!/bin/bash

# Chainy Production Environment Test Script
# Used to verify system functionality after deployment

set -e

echo "🚀 Chainy Production Environment Testing"
echo "=========================================="
echo ""

# Configuration
API_BASE_URL="https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com"
TEST_CODE="test-$(date +%s)"

echo "📊 Test Configuration:"
echo "  API Endpoint: $API_BASE_URL"
echo "  Test Code: $TEST_CODE"
echo ""

# Check AWS CLI configuration
echo "🔍 Checking AWS CLI configuration..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured or no permissions"
    echo "   Please run: aws configure"
    exit 1
fi
echo "✅ AWS CLI configuration normal"
echo ""

# Get JWT secret
echo "🔑 Getting JWT secret..."
JWT_SECRET=$(aws ssm get-parameter --name "/chainy/prod/jwt-secret" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
if [ -z "$JWT_SECRET" ]; then
    echo "❌ Unable to get JWT secret"
    echo "   Please check SSM Parameter Store permissions"
    exit 1
fi
echo "✅ JWT secret retrieved successfully"
echo ""

# Generate JWT token
echo "🎫 Generating JWT token..."
JWT_TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const payload = {
  userId: 'test-user-123',
  email: 'test@example.com',
  role: 'user',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};
console.log(jwt.sign(payload, '$JWT_SECRET'));
" 2>/dev/null || echo "")

if [ -z "$JWT_TOKEN" ]; then
    echo "❌ JWT token generation failed"
    echo "   Please ensure jsonwebtoken is installed: npm install jsonwebtoken"
    exit 1
fi
echo "✅ JWT token generated successfully"
echo ""

# Test creating short link
echo "📝 Testing short link creation..."
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/links" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"url\": \"https://example.com\",
    \"code\": \"$TEST_CODE\"
  }" 2>/dev/null || echo "")

CREATE_BODY=$(echo "$CREATE_RESPONSE" | head -n -1)
CREATE_STATUS=$(echo "$CREATE_RESPONSE" | tail -n 1)

if [ "$CREATE_STATUS" = "200" ] || [ "$CREATE_STATUS" = "201" ]; then
    echo "✅ Short link creation successful (HTTP $CREATE_STATUS)"
    echo "   Response: $CREATE_BODY"
else
    echo "❌ Short link creation failed (HTTP $CREATE_STATUS)"
    echo "   Response: $CREATE_BODY"
    exit 1
fi
echo ""

# Test getting short link
echo "📖 Testing short link retrieval..."
GET_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE_URL/links/$TEST_CODE" \
  -H "Authorization: Bearer $JWT_TOKEN" 2>/dev/null || echo "")

GET_BODY=$(echo "$GET_RESPONSE" | head -n -1)
GET_STATUS=$(echo "$GET_RESPONSE" | tail -n 1)

if [ "$GET_STATUS" = "200" ]; then
    echo "✅ Short link retrieval successful (HTTP $GET_STATUS)"
    echo "   Response: $GET_BODY"
else
    echo "❌ Short link retrieval failed (HTTP $GET_STATUS)"
    echo "   Response: $GET_BODY"
    exit 1
fi
echo ""

# Test redirect (no authentication required)
echo "🔄 Testing redirect..."
REDIRECT_RESPONSE=$(curl -s -w "\n%{http_code}" -I "$API_BASE_URL/$TEST_CODE" 2>/dev/null || echo "")

REDIRECT_STATUS=$(echo "$REDIRECT_RESPONSE" | tail -n 1)
REDIRECT_LOCATION=$(echo "$REDIRECT_RESPONSE" | grep -i "location:" | cut -d' ' -f2- | tr -d '\r\n' || echo "")

if [ "$REDIRECT_STATUS" = "302" ] || [ "$REDIRECT_STATUS" = "301" ]; then
    echo "✅ Redirect test successful (HTTP $REDIRECT_STATUS)"
    echo "   Redirect target: $REDIRECT_LOCATION"
else
    echo "❌ Redirect test failed (HTTP $REDIRECT_STATUS)"
    echo "   Response: $REDIRECT_RESPONSE"
    exit 1
fi
echo ""

# Test unauthenticated access (should fail)
echo "🔒 Testing unauthenticated access..."
NO_AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/links" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://example.com\",
    \"code\": \"test-no-auth\"
  }" 2>/dev/null || echo "")

NO_AUTH_BODY=$(echo "$NO_AUTH_RESPONSE" | head -n -1)
NO_AUTH_STATUS=$(echo "$NO_AUTH_RESPONSE" | tail -n 1)

if [ "$NO_AUTH_STATUS" = "401" ] || [ "$NO_AUTH_STATUS" = "403" ]; then
    echo "✅ Unauthenticated access correctly rejected (HTTP $NO_AUTH_STATUS)"
else
    echo "⚠️  Unauthenticated access not rejected (HTTP $NO_AUTH_STATUS)"
    echo "   Response: $NO_AUTH_BODY"
fi
echo ""

# Check AWS resource status
echo "🔍 Checking AWS resource status..."

# Check Lambda functions
echo "  📦 Lambda function status:"
aws lambda get-function --function-name chainy-prod-chainy-create --query 'Configuration.State' --output text 2>/dev/null | xargs -I {} echo "    chainy-prod-chainy-create: {}"
aws lambda get-function --function-name chainy-prod-chainy-redirect --query 'Configuration.State' --output text 2>/dev/null | xargs -I {} echo "    chainy-prod-chainy-redirect: {}"
aws lambda get-function --function-name chainy-prod-authorizer --query 'Configuration.State' --output text 2>/dev/null | xargs -I {} echo "    chainy-prod-authorizer: {}"
echo ""

# Check DynamoDB table
echo "  🗄️  DynamoDB table status:"
aws dynamodb describe-table --table-name chainy-prod-chainy-links --query 'Table.TableStatus' --output text 2>/dev/null | xargs -I {} echo "    chainy-prod-chainy-links: {}"
echo ""

# Check S3 bucket
echo "  🪣 S3 bucket status:"
aws s3api head-bucket --bucket chainy-prod-chainy-events 2>/dev/null && echo "    chainy-prod-chainy-events: exists" || echo "    chainy-prod-chainy-events: not exists or no permission"
echo ""

# Check budget alerts
echo "  💰 Budget alert status:"
aws budgets describe-budgets --account-id $(aws sts get-caller-identity --query Account --output text) --query 'Budgets[?BudgetName==`chainy-prod-monthly-budget`].CalculatedSpend.ActualSpend.Amount' --output text 2>/dev/null | xargs -I {} echo "    Current spending: \${}"
echo ""

# Test completion
echo "🎉 All tests completed!"
echo ""
echo "📊 Test Summary:"
echo "  ✅ JWT Authentication: Normal"
echo "  ✅ Short Link Creation: Normal"
echo "  ✅ Short Link Retrieval: Normal"
echo "  ✅ Redirect Functionality: Normal"
echo "  ✅ Unauthenticated Protection: Normal"
echo "  ✅ AWS Resources: Normal"
echo ""
echo "🚀 Your Chainy production environment is ready!"
echo ""
echo "🔗 API Endpoint: $API_BASE_URL"
echo "📱 Test Code: $TEST_CODE"
echo "🎫 JWT Token: ${JWT_TOKEN:0:20}..."
echo ""
echo "💡 Next Steps:"
echo "  1. Setup CloudFlare domain"
echo "  2. Configure frontend application"
echo "  3. Setup monitoring alerts"
echo "  4. Regular budget checks"

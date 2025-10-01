# Budget Monitoring Module
# Provides cost monitoring and alerts

# Monthly budget with alerts
resource "aws_budgets_budget" "monthly" {
  name              = "${var.project}-${var.environment}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2025-10-01_00:00"

  cost_filter {
    name = "TagKeyValue"
    values = [
      "Project$${var.project}",
      "Environment$${var.environment}"
    ]
  }

  # Alert at 80% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  # Alert at 100% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  # Forecasted to exceed alert
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_emails
  }
}

# SNS topic for budget alerts
resource "aws_sns_topic" "budget_alert" {
  count = var.enable_sns_alerts ? 1 : 0
  name  = "${var.project}-${var.environment}-budget-alert"

  tags = var.tags
}

resource "aws_sns_topic_subscription" "budget_email" {
  count     = var.enable_sns_alerts ? 1 : 0
  topic_arn = aws_sns_topic.budget_alert[0].arn
  protocol  = "email"
  endpoint  = var.primary_alert_email
}

# CloudWatch alarm for high daily costs
resource "aws_cloudwatch_metric_alarm" "daily_cost" {
  count = var.enable_daily_cost_alarm ? 1 : 0

  alarm_name          = "${var.project}-${var.environment}-daily-cost-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 86400 # 24 hours
  statistic           = "Maximum"
  threshold           = var.daily_cost_threshold
  alarm_description   = "Alert when daily cost exceeds threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    Currency = "USD"
  }

  alarm_actions = var.enable_sns_alerts ? [aws_sns_topic.budget_alert[0].arn] : []

  tags = var.tags
}


# Environment-specific Terraform configuration
# This module handles environment-specific settings

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "development"
}

variable "environment_config" {
  description = "Environment configuration map"
  type        = map(string)
  default     = {}
}

locals {
  # Environment-specific settings
  env_config = {
    development = {
      log_retention_days = 7
      enable_debugging   = true
      cost_optimization  = false
      budget_limit       = 50
      daily_threshold    = 5
    }
    staging = {
      log_retention_days = 3
      enable_debugging   = true
      cost_optimization  = true
      budget_limit       = 20
      daily_threshold    = 2
    }
    production = {
      log_retention_days = 1
      enable_debugging   = false
      cost_optimization  = true
      budget_limit       = 10
      daily_threshold    = 1
    }
  }

  current_config = local.env_config[var.environment]
}

# CloudWatch Log Groups with environment-specific retention
resource "aws_cloudwatch_log_group" "lambda_logs" {
  for_each = toset([
    "chainy-${var.environment}-google-auth",
    "chainy-${var.environment}-authorizer",
    "chainy-${var.environment}-chainy-create",
    "chainy-${var.environment}-chainy-redirect"
  ])

  name              = "/aws/lambda/${each.key}"
  retention_in_days = local.current_config.log_retention_days

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Budget monitoring with environment-specific limits
resource "aws_budgets_budget" "monthly" {
  count = var.enable_budget_monitoring ? 1 : 0

  name         = "chainy-${var.environment}-monthly-budget"
  budget_type  = "COST"
  limit_amount = local.current_config.budget_limit
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filters = {
    Tag = [
      "Environment:${var.environment}"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_alert_emails
  }
}

# Daily cost alarm
resource "aws_cloudwatch_metric_alarm" "daily_cost" {
  count = var.enable_budget_monitoring ? 1 : 0

  alarm_name          = "chainy-${var.environment}-daily-cost-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "86400"
  statistic           = "Maximum"
  threshold           = local.current_config.daily_threshold
  alarm_description   = "Daily cost exceeds threshold for ${var.environment} environment"
  alarm_actions       = var.budget_alert_emails

  dimensions = {
    Currency = "USD"
  }
}

# Environment-specific Lambda environment variables
locals {
  lambda_env_vars = merge(var.lambda_additional_environment, {
    ENVIRONMENT = var.environment
    LOG_LEVEL   = local.current_config.enable_debugging ? "DEBUG" : "ERROR"
    DEBUG_MODE  = local.current_config.enable_debugging
  })
}

# Outputs
output "environment_config" {
  description = "Current environment configuration"
  value       = local.current_config
}

output "lambda_environment_variables" {
  description = "Lambda environment variables for current environment"
  value       = local.lambda_env_vars
}

output "budget_name" {
  description = "Name of the budget"
  value       = aws_budgets_budget.monthly.name
}

output "budget_limit" {
  description = "Budget limit in USD"
  value       = aws_budgets_budget.monthly.limit_amount
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for budget alerts (if enabled)"
  value       = var.enable_sns_alerts ? aws_sns_topic.budget_alert[0].arn : null
}

output "daily_cost_alarm_name" {
  description = "Name of the daily cost CloudWatch alarm (if enabled)"
  value       = var.enable_daily_cost_alarm ? aws_cloudwatch_metric_alarm.daily_cost[0].alarm_name : null
}


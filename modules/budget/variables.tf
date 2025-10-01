variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 20
}

variable "daily_cost_threshold" {
  description = "Daily cost threshold for alerts in USD"
  type        = number
  default     = 2
}

variable "alert_emails" {
  description = "List of email addresses to receive budget alerts"
  type        = list(string)
  default     = []
}

variable "primary_alert_email" {
  description = "Primary email for SNS alerts"
  type        = string
  default     = ""
}

variable "enable_sns_alerts" {
  description = "Enable SNS topic for budget alerts"
  type        = bool
  default     = false
}

variable "enable_daily_cost_alarm" {
  description = "Enable CloudWatch alarm for daily costs"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}


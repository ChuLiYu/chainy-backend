variable "environment" {
  description = "Environment name"
  type        = string
}

variable "environment_config" {
  description = "Environment configuration map"
  type        = map(string)
  default     = {}
}

variable "enable_budget_monitoring" {
  description = "Enable budget monitoring"
  type        = bool
  default     = true
}

variable "budget_alert_emails" {
  description = "Email addresses for budget alerts"
  type        = list(string)
  default     = []
}

variable "lambda_additional_environment" {
  description = "Additional Lambda environment variables"
  type        = map(string)
  default     = {}
}

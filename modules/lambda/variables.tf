# Configuration inputs for the Lambda module.

variable "project" {
  description = "Project identifier for naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "tags" {
  description = "Tags applied to resources."
  type        = map(string)
}

variable "table_name" {
  description = "DynamoDB table name storing short links."
  type        = string
}

variable "table_arn" {
  description = "DynamoDB table ARN for IAM policies."
  type        = string
}

variable "event_bus_name" {
  description = "EventBridge bus name to publish domain events."
  type        = string
}

variable "redirect_source_dir" {
  description = "Directory containing compiled redirect Lambda sources."
  type        = string
}

variable "create_source_dir" {
  description = "Directory containing compiled create Lambda sources."
  type        = string
}

variable "log_retention_in_days" {
  description = "Retention for Lambda log groups."
  type        = number
  default     = 14
}

variable "redirect_memory_mb" {
  description = "Memory allocation for the redirect Lambda."
  type        = number
  default     = 128
}

variable "create_memory_mb" {
  description = "Memory allocation for the create Lambda."
  type        = number
  default     = 256
}

variable "redirect_timeout_seconds" {
  description = "Timeout for the redirect Lambda."
  type        = number
  default     = 3
}

variable "create_timeout_seconds" {
  description = "Timeout for the create Lambda."
  type        = number
  default     = 10
}

variable "additional_environment" {
  description = "Additional environment variables merged into both functions."
  type        = map(string)
  default     = {}
}

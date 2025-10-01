variable "project" {
  description = "Project name used in resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "jwt_secret" {
  description = "JWT secret for API authentication (leave empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "api_gateway_arn" {
  description = "ARN of the API Gateway stage to protect with WAF"
  type        = string
  default     = ""
}

variable "rate_limit_per_5min" {
  description = "Maximum number of requests per IP per 5 minutes"
  type        = number
  default     = 2000
}

variable "blocked_countries" {
  description = "List of country codes to block (ISO 3166-1 alpha-2)"
  type        = list(string)
  default     = []
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention period in days"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}


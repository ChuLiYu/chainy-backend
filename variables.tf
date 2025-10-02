# Global input variables for the Chainy root module.

variable "project" {
  description = "Project identifier used for naming resources."
  type        = string
  default     = "chainy"
}

variable "environment" {
  description = "Deployment environment identifier (e.g. dev, prod)."
  type        = string
}

variable "region" {
  description = "AWS region for all primary resources."
  type        = string
  default     = "ap-northeast-1"
}

# Paths to the Lambda build output that Terraform will package into zip files.
variable "redirect_build_dir" {
  description = "Relative or absolute path to the compiled redirect Lambda artifact directory (bundled Node.js files)."
  type        = string
  default     = "dist/redirect"
}

variable "create_build_dir" {
  description = "Relative or absolute path to the compiled create Lambda artifact directory."
  type        = string
  default     = "dist/create"
}

# Operational tuning knobs for log storage and data retention.
variable "log_retention_in_days" {
  description = "CloudWatch Logs retention period for Lambda log groups."
  type        = number
  default     = 14
}

variable "click_events_retention_days" {
  description = "Number of days to retain raw event objects in S3 before lifecycle expiration."
  type        = number
  default     = 30
}

# Allow callers to attach additional metadata tags to every resource.
variable "extra_tags" {
  description = "Additional resource tags merged with the defaults."
  type        = map(string)
  default     = {}
}

variable "lambda_additional_environment" {
  description = "Additional environment variables injected into the Chainy Lambda functions (e.g. salts for hashing)."
  type        = map(string)
  default     = {}
}

variable "hash_salt_parameter_name" {
  description = "SSM parameter name storing the hash salt. Defaults to /chainy/<environment>/CHAINY_HASH_SALT."
  type        = string
  default     = null
}

variable "ip_hash_salt_parameter_name" {
  description = "SSM parameter name storing the IP hash salt. Defaults to /chainy/<environment>/CHAINY_IP_HASH_SALT."
  type        = string
  default     = null
}

variable "hash_salt_fallback" {
  description = "Fallback hash salt value if SSM parameter retrieval fails."
  type        = string
  default     = ""
}

variable "ip_hash_salt_fallback" {
  description = "Fallback IP hash salt value if SSM parameter retrieval fails."
  type        = string
  default     = ""
}

variable "web_domain" {
  description = "(Optional) Root domain (e.g. example.com) used for hosting the Chainy web front-end. Leave null to skip front-end infrastructure."
  type        = string
  default     = null
}

variable "web_subdomain" {
  description = "Subdomain used for the front-end distribution (e.g. chainy -> chainy.example.com)."
  type        = string
  default     = "chainy"
}

variable "web_hosted_zone_id" {
  description = "Route 53 hosted zone ID for the provided web domain. Required when web_domain is set."
  type        = string
  default     = null

  validation {
    condition     = var.web_domain == null ? var.web_hosted_zone_id == null : var.web_hosted_zone_id != null
    error_message = "web_hosted_zone_id must be provided when web_domain is set."
  }
}

variable "web_price_class" {
  description = "CloudFront price class for the front-end distribution."
  type        = string
  default     = "PriceClass_100"
}

# ============================================================================
# Security Configuration
# ============================================================================

variable "enable_authentication" {
  description = "Enable JWT authentication for API endpoints."
  type        = bool
  default     = false
}

variable "jwt_secret" {
  description = "JWT secret for signing tokens. Leave empty to auto-generate."
  type        = string
  default     = ""
  sensitive   = true
}

variable "enable_waf" {
  description = "Enable AWS WAF for API Gateway protection."
  type        = bool
  default     = false
}

variable "waf_rate_limit_per_5min" {
  description = "Maximum number of requests per IP address per 5 minutes."
  type        = number
  default     = 2000
}

variable "waf_blocked_countries" {
  description = "List of country codes to block (ISO 3166-1 alpha-2)."
  type        = list(string)
  default     = []
}

# ============================================================================
# Budget and Cost Control
# ============================================================================

variable "enable_budget_monitoring" {
  description = "Enable AWS Budgets monitoring and alerts."
  type        = bool
  default     = false
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD. Alerts at 80% and 100%."
  type        = number
  default     = 20
}

variable "daily_cost_threshold" {
  description = "Daily cost threshold in USD for CloudWatch alerts."
  type        = number
  default     = 2
}

variable "budget_alert_emails" {
  description = "List of email addresses to receive budget alerts."
  type        = list(string)
  default     = []
}

# ============================================================================
# Google OAuth Configuration
# ============================================================================

variable "google_client_id" {
  description = "Google OAuth 2.0 Client ID for authentication."
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth 2.0 Client Secret for authentication."
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_redirect_uri" {
  description = "Google OAuth redirect URI used when exchanging authorization codes."
  type        = string
  default     = ""
}

variable "users_table_name" {
  description = "DynamoDB users table name for storing user information."
  type        = string
  default     = ""
}

variable "users_table_arn" {
  description = "DynamoDB users table ARN for IAM permissions."
  type        = string
  default     = ""
}

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

variable "events_bucket_name" {
  description = "S3 bucket name where Lambda will store domain events."
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

variable "hash_salt_parameter_name" {
  description = "SSM parameter name storing the hash salt (used for IAM permissions)."
  type        = string
}

variable "ip_hash_salt_parameter_name" {
  description = "SSM parameter name storing the IP hash salt (used for IAM permissions)."
  type        = string
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

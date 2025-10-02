# Google Authentication Lambda Module Variables

variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "jwt_secret_parameter_name" {
  description = "SSM Parameter name for JWT secret"
  type        = string
}

variable "jwt_secret_parameter_arn" {
  description = "SSM Parameter ARN for JWT secret"
  type        = string
}

variable "users_table_name" {
  description = "DynamoDB users table name"
  type        = string
}

variable "users_table_arn" {
  description = "DynamoDB users table ARN"
  type        = string
}

variable "google_client_id" {
  description = "Google OAuth 2.0 Client ID for authentication."
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth 2.0 Client Secret for authentication."
  type        = string
  sensitive   = true
}

variable "google_redirect_uri" {
  description = "Optional Google OAuth redirect URI used when exchanging authorization codes."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Inputs for the analytics/event pipeline resources.

variable "project" {
  description = "Project identifier for naming resources."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "tags" {
  description = "Base tags applied to created resources."
  type        = map(string)
}

variable "retention_days" {
  description = "Number of days to keep raw event data in the S3 bucket before lifecycle expiration."
  type        = number
  default     = 30
}

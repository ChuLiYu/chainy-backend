# Inputs shared by the DynamoDB module.

variable "project" {
  description = "Project identifier for naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "tags" {
  description = "Tags applied to the DynamoDB table."
  type        = map(string)
}

# Inputs required to expose the HTTP API surface.

variable "project" {
  description = "Project identifier for naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "tags" {
  description = "Tags applied to API resources."
  type        = map(string)
}

variable "redirect_lambda_arn" {
  description = "ARN of the Lambda function handling redirects."
  type        = string
}

variable "redirect_lambda_name" {
  description = "Name of the Lambda function handling redirects."
  type        = string
}

variable "create_lambda_arn" {
  description = "ARN of the Lambda function managing short link CRUD."
  type        = string
}

variable "create_lambda_name" {
  description = "Name of the Lambda function managing short link CRUD."
  type        = string
}

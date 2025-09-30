variable "project" {
  description = "Project identifier for tagging the bootstrap resources."
  type        = string
  default     = "chainy"
}

variable "environment" {
  description = "Environment label (e.g. dev, prod)."
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS region where the state bucket and lock table will be created."
  type        = string
  default     = "ap-northeast-1"
}

variable "state_bucket_name" {
  description = "Globally unique S3 bucket name to store Terraform state."
  type        = string
}

variable "lock_table_name" {
  description = "DynamoDB table name used for Terraform state locking."
  type        = string
  default     = "chainy-terraform-locks"
}

variable "tags" {
  description = "Additional tags applied to bootstrap resources."
  type        = map(string)
  default     = {}
}

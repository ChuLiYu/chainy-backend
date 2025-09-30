# Bootstrap Terraform configuration for creating remote state resources.
terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }

  # Use a local backend so we can create the remote state bucket/table.
  backend "local" {}
}

provider "aws" {
  region = var.region
}

# Create an S3 bucket dedicated to Terraform state storage.
resource "aws_s3_bucket" "tf_state" {
  bucket = var.state_bucket_name

  tags = merge(var.tags, {
    Name        = var.state_bucket_name
    Purpose     = "terraform-state"
    Environment = var.environment
  })
}

# Enable bucket versioning so Terraform can keep state history.
resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Default server-side encryption for state files at rest.
resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# DynamoDB table used for Terraform state locking.
resource "aws_dynamodb_table" "tf_lock" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = merge(var.tags, {
    Name        = var.lock_table_name
    Purpose     = "terraform-lock"
    Environment = var.environment
  })
}

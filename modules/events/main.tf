# Derive consistent naming for the event storage bucket.
locals {
  bucket_name = "${var.project}-${var.environment}-chainy-events"
}

# S3 bucket storing raw Chainy domain events written by Lambda functions.
resource "aws_s3_bucket" "events" {
  bucket        = local.bucket_name
  force_destroy = false

  tags = merge(var.tags, {
    Name        = local.bucket_name
    Environment = var.environment
    Purpose     = "chainy-events"
  })
}

# Block all forms of public access to the events bucket.
resource "aws_s3_bucket_public_access_block" "events" {
  bucket = aws_s3_bucket.events.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning in case events need to be restored.
resource "aws_s3_bucket_versioning" "events" {
  bucket = aws_s3_bucket.events.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Default server-side encryption for events stored at rest.
resource "aws_s3_bucket_server_side_encryption_configuration" "events" {
  bucket = aws_s3_bucket.events.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle management keeps storage costs predictable.
resource "aws_s3_bucket_lifecycle_configuration" "events" {
  bucket = aws_s3_bucket.events.id

  rule {
    id     = "expire-events"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = var.retention_days
    }
  }
}

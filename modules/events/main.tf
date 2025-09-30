# Consistent names for the event pipeline components.
locals {
  bus_name     = "${var.project}-${var.environment}-chainy-bus"
  bucket_name  = "${var.project}-${var.environment}-chainy-click-events"
  firehose_name = "${var.project}-${var.environment}-chainy-firehose"
  log_group_name = "/aws/kinesisfirehose/${var.project}-${var.environment}-chainy"
}

# Dedicated event bus for Chainy domain events.
resource "aws_cloudwatch_event_bus" "chainy" {
  name = local.bus_name

  tags = merge(var.tags, {
    "Name" = local.bus_name
  })
}

# S3 bucket stores the batched click analytics.
resource "aws_s3_bucket" "click_events" {
  bucket        = local.bucket_name
  force_destroy = false

  tags = merge(var.tags, {
    "Name" = local.bucket_name
  })
}

# Block all public access to the analytics bucket.
resource "aws_s3_bucket_public_access_block" "click_events" {
  bucket = aws_s3_bucket.click_events.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Default server-side encryption for the analytics bucket.
resource "aws_s3_bucket_server_side_encryption_configuration" "click_events" {
  bucket = aws_s3_bucket.click_events.bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle policy keeps storage costs predictable.
resource "aws_s3_bucket_lifecycle_configuration" "click_events" {
  bucket = aws_s3_bucket.click_events.id

  rule {
    id     = "expire-click-events"
    status = "Enabled"

    expiration {
      days = var.retention_days
    }
  }
}

# Capture Firehose delivery diagnostics.
resource "aws_cloudwatch_log_group" "firehose" {
  name              = local.log_group_name
  retention_in_days = 14

  tags = var.tags
}

# Firehose buffers events from EventBridge into S3 partitions.
resource "aws_kinesis_firehose_delivery_stream" "click_events" {
  name        = local.firehose_name
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn           = aws_iam_role.firehose.arn
    bucket_arn         = aws_s3_bucket.click_events.arn
    buffering_interval = 60
    buffering_size     = 1
    compression_format = "GZIP"
    prefix             = "year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    error_output_prefix = "failed/!{firehose:error-output-type}/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"

    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.firehose.name
      log_stream_name = "delivery"
    }
  }

  tags = merge(var.tags, {
    "Name" = local.firehose_name
  })
}

# IAM role assumed by Firehose when writing to S3 and CloudWatch Logs.
resource "aws_iam_role" "firehose" {
  name = "${var.project}-${var.environment}-firehose-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

# Principle of least privilege for Firehose access.
resource "aws_iam_role_policy" "firehose" {
  name = "${var.project}-${var.environment}-firehose-policy"
  role = aws_iam_role.firehose.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.click_events.arn,
          "${aws_s3_bucket.click_events.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:PutLogEvents",
          "logs:CreateLogStream"
        ]
        Resource = "${aws_cloudwatch_log_group.firehose.arn}:*"
      }
    ]
  })
}

# Role EventBridge uses to invoke the Firehose delivery stream.
resource "aws_iam_role" "eventbridge_target" {
  name = "${var.project}-${var.environment}-eventbridge-firehose-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

# Allow EventBridge to push individual or batched records.
resource "aws_iam_role_policy" "eventbridge_target" {
  name = "${var.project}-${var.environment}-eventbridge-firehose-policy"
  role = aws_iam_role.eventbridge_target.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "firehose:PutRecord",
          "firehose:PutRecordBatch"
        ]
        Resource = aws_kinesis_firehose_delivery_stream.click_events.arn
      }
    ]
  })
}

# Match Chainy domain events that should flow into analytics.
resource "aws_cloudwatch_event_rule" "link_events" {
  name          = "${var.project}-${var.environment}-link-events"
  event_bus_name = aws_cloudwatch_event_bus.chainy.name

  event_pattern = jsonencode({
    source = ["chainy.links"],
    "detail-type" = ["link_click", "link_create"]
  })

  tags = var.tags
}

# Wire the rule to Firehose using the permissions role above.
resource "aws_cloudwatch_event_target" "firehose" {
  rule          = aws_cloudwatch_event_rule.link_events.name
  event_bus_name = aws_cloudwatch_event_rule.link_events.event_bus_name
  arn           = aws_kinesis_firehose_delivery_stream.click_events.arn
  role_arn      = aws_iam_role.eventbridge_target.arn
}

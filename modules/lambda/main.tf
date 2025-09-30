# Precompute names, IAM permissions, and paths shared across both functions.
locals {
  base_name = "${var.project}-${var.environment}-chainy"

  function_config = {
    redirect = {
      name        = "${local.base_name}-redirect"
      description = "Redirect short codes to their target URLs with click tracking."
      memory      = var.redirect_memory_mb
      timeout     = var.redirect_timeout_seconds
    }
    create = {
      name        = "${local.base_name}-create"
      description = "Create or update Chainy short links and emit events."
      memory      = var.create_memory_mb
      timeout     = var.create_timeout_seconds
    }
  }

  dynamodb_actions = {
    redirect = [
      "dynamodb:GetItem",
      "dynamodb:UpdateItem"
    ]
    create = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem"
    ]
  }

  base_environment = merge({
    CHAINY_ENVIRONMENT    = var.environment,
    CHAINY_TABLE_NAME     = var.table_name,
    CHAINY_EVENT_BUS_NAME = var.event_bus_name
  }, var.additional_environment)

  source_dirs = {
    redirect = var.redirect_source_dir
    create   = var.create_source_dir
  }
}

# Discover account/region for IAM policy wiring.
data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

# Zip the pre-built handler directories for upload.
data "archive_file" "lambda" {
  for_each = local.source_dirs

  type        = "zip"
  source_dir  = each.value
  output_path = "${path.module}/build/${each.key}.zip"
}

# Execution role for each Lambda function.
resource "aws_iam_role" "lambda" {
  for_each = local.function_config

  name = "${each.value.name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

# Attach least-privilege policies tailored to each handler.
resource "aws_iam_role_policy" "lambda" {
  for_each = local.function_config

  name = "${each.value.name}-policy"
  role = aws_iam_role.lambda[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = local.dynamodb_actions[each.key]
        Resource = var.table_arn
      },
      {
        Effect = "Allow"
        Action = ["events:PutEvents"]
        Resource = "arn:aws:events:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:event-bus/${var.event_bus_name}"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# Manage log groups explicitly to control retention.
resource "aws_cloudwatch_log_group" "lambda" {
  for_each = local.function_config

  name              = "/aws/lambda/${each.value.name}"
  retention_in_days = var.log_retention_in_days

  tags = var.tags
}

# Deploy the Lambda functions built from the TypeScript sources.
resource "aws_lambda_function" "lambda" {
  for_each = local.function_config

  function_name = each.value.name
  description   = each.value.description
  role          = aws_iam_role.lambda[each.key].arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  memory_size   = each.value.memory
  timeout       = each.value.timeout

  filename         = data.archive_file.lambda[each.key].output_path
  source_code_hash = data.archive_file.lambda[each.key].output_base64sha256

  environment {
    variables = local.base_environment
  }

  tags = var.tags
}

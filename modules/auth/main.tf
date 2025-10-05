# Google Authentication Lambda Module
# Handles Google OAuth 2.0 authentication and JWT token generation

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

locals {
  function_name = "${var.project}-${var.environment}-google-auth"
}

# Lambda function for Google authentication
resource "aws_lambda_function" "google_auth" {
  function_name    = local.function_name
  role             = aws_iam_role.google_auth.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  filename         = data.archive_file.google_auth_zip.output_path
  source_code_hash = data.archive_file.google_auth_zip.output_base64sha256

  environment {
    variables = {
      NODE_ENV                            = var.environment
      JWT_SECRET_PARAMETER_NAME           = var.jwt_secret_parameter_name
      USERS_TABLE_NAME                    = var.users_table_name
      GOOGLE_CLIENT_ID                    = var.google_client_id
      GOOGLE_CLIENT_SECRET_PARAMETER_NAME = var.google_client_secret_parameter_name
      GOOGLE_REDIRECT_URI                 = var.google_redirect_uri
    }
  }

  timeout     = 30
  memory_size = 256

  tags = merge(var.tags, {
    "Name" = local.function_name
  })
}

# IAM role for Google Auth Lambda
resource "aws_iam_role" "google_auth" {
  name = "${local.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM policy for Google Auth Lambda
resource "aws_iam_role_policy" "google_auth" {
  name = "${local.function_name}-policy"
  role = aws_iam_role.google_auth.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          var.jwt_secret_parameter_arn,
          "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${var.google_client_secret_parameter_name}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          var.users_table_arn,
          "${var.users_table_arn}/index/*"
        ]
      }
    ]
  })
}

# Archive the Google Auth Lambda code
data "archive_file" "google_auth_zip" {
  type        = "zip"
  source_file = "${path.module}/../../dist/googleAuth/index.js"
  output_path = "${path.module}/build/googleAuth.zip"
}

# Build the Google Auth Lambda code
resource "null_resource" "build_google_auth" {
  triggers = {
    source_hash = filemd5("${path.module}/../../handlers/googleAuth.ts")
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ${path.module}/../..
      npx esbuild handlers/googleAuth.ts \
        --bundle \
        --platform=node \
        --target=node18 \
        --outfile=modules/auth/build/googleAuth.js \
        --external:@aws-sdk/* \
        --format=esm
    EOT
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "google_auth" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 14

  tags = var.tags
}

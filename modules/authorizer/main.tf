# Lambda Authorizer Module
# Provides JWT-based authentication for API Gateway

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

locals {
  function_name = "${var.project}-${var.environment}-authorizer"
}

# IAM role for the authorizer Lambda
resource "aws_iam_role" "authorizer" {
  name = local.function_name

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

# Attach basic execution policy
resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.authorizer.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Policy to read JWT secret from SSM Parameter Store
resource "aws_iam_role_policy" "ssm_access" {
  name = "${local.function_name}-ssm"
  role = aws_iam_role.authorizer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = var.jwt_secret_parameter_arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "authorizer" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# Lambda function for authorization
resource "aws_lambda_function" "authorizer" {
  function_name = local.function_name
  filename      = var.lambda_zip_path
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.authorizer.arn
  timeout       = 10
  memory_size   = 256

  source_code_hash = filebase64sha256(var.lambda_zip_path)

  environment {
    variables = {
      JWT_SECRET_PARAMETER_NAME = var.jwt_secret_parameter_name
      NODE_ENV                  = var.environment
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.authorizer,
    aws_iam_role_policy_attachment.basic_execution,
    aws_iam_role_policy.ssm_access,
  ]

  tags = var.tags
}

# CloudWatch alarms for authorizer
resource "aws_cloudwatch_metric_alarm" "authorizer_errors" {
  alarm_name          = "${local.function_name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alerts when authorizer has too many errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.authorizer.function_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "authorizer_throttles" {
  alarm_name          = "${local.function_name}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alerts when authorizer is being throttled"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.authorizer.function_name
  }

  tags = var.tags
}


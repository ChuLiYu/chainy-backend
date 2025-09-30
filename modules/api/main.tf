# Name the HTTP API consistently by project/environment.
locals {
  api_name = "${var.project}-${var.environment}-chainy-http"
}

# Provision an HTTP API Gateway as the public entry point.
resource "aws_apigatewayv2_api" "chainy" {
  name          = local.api_name
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["content-type", "x-amz-date", "authorization", "x-api-key", "x-amz-security-token"]
    max_age       = 300
  }

  tags = merge(var.tags, {
    "Name" = local.api_name
  })
}

# Proxy integration for the redirect Lambda.
resource "aws_apigatewayv2_integration" "redirect" {
  api_id                 = aws_apigatewayv2_api.chainy.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  payload_format_version = "2.0"
  integration_uri        = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.redirect_lambda_arn}/invocations"
}

# Proxy integration for CRUD Lambda operations.
resource "aws_apigatewayv2_integration" "links" {
  api_id                 = aws_apigatewayv2_api.chainy.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  payload_format_version = "2.0"
  integration_uri        = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.create_lambda_arn}/invocations"
}

# Catch-all GET route resolves short codes to targets.
resource "aws_apigatewayv2_route" "redirect" {
  api_id    = aws_apigatewayv2_api.chainy.id
  route_key = "GET /{code+}"
  target    = "integrations/${aws_apigatewayv2_integration.redirect.id}"
}

# CRUD endpoints share the same Lambda integration.
resource "aws_apigatewayv2_route" "create" {
  for_each = toset([
    "POST /links",
    "GET /links/{code}",
    "PUT /links/{code}",
    "DELETE /links/{code}"
  ])

  api_id    = aws_apigatewayv2_api.chainy.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.links.id}"
  
  # Require API Key for authenticated endpoints
  api_key_required = true
}

# API Key for authentication
resource "aws_api_gateway_api_key" "chainy" {
  name = "${local.api_name}-key"
  tags = var.tags
}

# Usage Plan for API Key
resource "aws_api_gateway_usage_plan" "chainy" {
  name = "${local.api_name}-usage-plan"
  
  api_stages {
    api_id = aws_apigatewayv2_api.chainy.id
    stage  = aws_apigatewayv2_stage.main.name
  }
  
  quota_settings {
    limit  = 10000
    period = "DAY"
  }
  
  throttle_settings {
    burst_limit = 100
    rate_limit  = 50
  }
  
  tags = var.tags
}

# Associate API Key with Usage Plan
resource "aws_api_gateway_usage_plan_key" "chainy" {
  key_id        = aws_api_gateway_api_key.chainy.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.chainy.id
}

# Use the default stage with modest throttling defaults.
resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.chainy.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  tags = var.tags
}

# Region/account details used in Lambda permissions.
data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

# Allow API Gateway to invoke the redirect Lambda.
resource "aws_lambda_permission" "redirect" {
  statement_id  = "AllowInvokeByHttpApiRedirect"
  action        = "lambda:InvokeFunction"
  function_name = var.redirect_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.chainy.id}/*/*/*"
}

# Allow API Gateway to invoke the CRUD Lambda.
resource "aws_lambda_permission" "links" {
  statement_id  = "AllowInvokeByHttpApiLinks"
  action        = "lambda:InvokeFunction"
  function_name = var.create_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.chainy.id}/*/*/*"
}

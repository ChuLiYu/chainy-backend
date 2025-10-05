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

# Proxy integration for Google Auth Lambda.
resource "aws_apigatewayv2_integration" "google_auth" {
  count = var.google_auth_lambda_arn != "" ? 1 : 0

  api_id                 = aws_apigatewayv2_api.chainy.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  payload_format_version = "2.0"
  integration_uri        = var.google_auth_lambda_arn
}

# Root path route for frontend redirect
resource "aws_apigatewayv2_route" "root" {
  api_id    = aws_apigatewayv2_api.chainy.id
  route_key = "GET /"
  target    = "integrations/${aws_apigatewayv2_integration.redirect.id}"
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
    "GET /links",
    "GET /links/{code}",
    "PUT /links/{code}",
    "DELETE /links/{code}"
  ])

  api_id    = aws_apigatewayv2_api.chainy.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.links.id}"

  # Apply authorizer to CRUD endpoints if authentication is enabled
  authorization_type = var.enable_authentication ? "CUSTOM" : "NONE"
  authorizer_id      = var.enable_authentication && length(aws_apigatewayv2_authorizer.jwt) > 0 ? aws_apigatewayv2_authorizer.jwt[0].id : null
}

# Google Auth endpoint
resource "aws_apigatewayv2_route" "google_auth" {
  count = var.google_auth_lambda_arn != "" ? 1 : 0

  api_id    = aws_apigatewayv2_api.chainy.id
  route_key = "POST /auth/google"
  target    = "integrations/${aws_apigatewayv2_integration.google_auth[0].id}"

  # No authorization required for Google auth endpoint
  authorization_type = "NONE"
}

# Lambda Authorizer for JWT authentication
resource "aws_apigatewayv2_authorizer" "jwt" {
  count = var.enable_authentication ? 1 : 0

  api_id          = aws_apigatewayv2_api.chainy.id
  authorizer_type = "REQUEST"
  name            = "${var.project}-${var.environment}-jwt-authorizer"
  authorizer_uri  = var.authorizer_lambda_arn

  identity_sources = ["$request.header.Authorization"]

  authorizer_payload_format_version = "2.0"
  authorizer_result_ttl_in_seconds  = 300
  enable_simple_responses           = false
}

# Permission for API Gateway to invoke the authorizer
resource "aws_lambda_permission" "authorizer" {
  count = var.enable_authentication && var.authorizer_lambda_name != "" ? 1 : 0

  statement_id  = "AllowInvokeByHttpApiAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = var.authorizer_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.chainy.id}/authorizers/${try(aws_apigatewayv2_authorizer.jwt[0].id, "*")}"
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

# Allow API Gateway to invoke the Google Auth Lambda.
resource "aws_lambda_permission" "google_auth" {
  count = var.google_auth_lambda_arn != "" ? 1 : 0

  statement_id  = "AllowInvokeByHttpApiGoogleAuth"
  action        = "lambda:InvokeFunction"
  function_name = var.google_auth_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.chainy.id}/*/*/*"
}

# Share API identifiers with other modules.

output "api_id" {
  description = "API Gateway HTTP API identifier."
  value       = aws_apigatewayv2_api.chainy.id
}

output "api_endpoint" {
  description = "Invoke URL for the HTTP API."
  value       = aws_apigatewayv2_api.chainy.api_endpoint
}

output "api_arn" {
  description = "ARN of the API Gateway stage for WAF association."
  value       = aws_apigatewayv2_stage.main.arn
}

output "authorizer_id" {
  description = "ID of the JWT authorizer (if enabled)."
  value       = var.enable_authentication && length(aws_apigatewayv2_authorizer.jwt) > 0 ? aws_apigatewayv2_authorizer.jwt[0].id : null
}

# Share API identifiers with other modules.

output "api_id" {
  description = "API Gateway HTTP API identifier."
  value       = aws_apigatewayv2_api.chainy.id
}

output "api_endpoint" {
  description = "Invoke URL for the HTTP API."
  value       = aws_apigatewayv2_api.chainy.api_endpoint
}

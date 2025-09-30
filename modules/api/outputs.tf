# Share API identifiers with other modules.

output "api_id" {
  description = "API Gateway HTTP API identifier."
  value       = aws_apigatewayv2_api.chainy.id
}

output "api_endpoint" {
  description = "Invoke URL for the HTTP API."
  value       = aws_apigatewayv2_api.chainy.api_endpoint
}

output "api_key_id" {
  description = "API Key ID for authentication."
  value       = aws_apigatewayv2_api_key.chainy.id
  sensitive   = true
}

output "api_key_value" {
  description = "API Key value for authentication."
  value       = aws_apigatewayv2_api_key.chainy.value
  sensitive   = true
}

# Expose Lambda identifiers for downstream integrations.

output "redirect_lambda_arn" {
  description = "ARN of the redirect Lambda function."
  value       = aws_lambda_function.lambda["redirect"].arn
}

output "redirect_lambda_name" {
  description = "Name of the redirect Lambda function."
  value       = aws_lambda_function.lambda["redirect"].function_name
}

output "create_lambda_arn" {
  description = "ARN of the create Lambda function."
  value       = aws_lambda_function.lambda["create"].arn
}

output "create_lambda_name" {
  description = "Name of the create Lambda function."
  value       = aws_lambda_function.lambda["create"].function_name
}

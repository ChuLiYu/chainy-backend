# Google Authentication Lambda Module Outputs

output "function_name" {
  description = "Name of the Google Auth Lambda function"
  value       = aws_lambda_function.google_auth.function_name
}

output "function_arn" {
  description = "ARN of the Google Auth Lambda function"
  value       = aws_lambda_function.google_auth.arn
}

output "function_invoke_arn" {
  description = "Invoke ARN of the Google Auth Lambda function"
  value       = aws_lambda_function.google_auth.invoke_arn
}

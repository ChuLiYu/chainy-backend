output "environment_config" {
  description = "Current environment configuration"
  value       = module.environment.environment_config
}

output "lambda_environment_variables" {
  description = "Lambda environment variables for current environment"
  value       = module.environment.lambda_environment_variables
}

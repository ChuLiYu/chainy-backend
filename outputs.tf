# Key values surfaced after deployment for testing and integrations.

output "api_endpoint" {
  description = "HTTP API base URL for invoking Chainy endpoints."
  value       = module.api.api_endpoint
}

output "links_table_name" {
  description = "DynamoDB table storing short links."
  value       = module.db.table_name
}

output "events_bucket_name" {
  description = "S3 bucket receiving Chainy domain events directly from Lambda."
  value       = module.events.bucket_name
}

output "web_bucket_name" {
  description = "S3 bucket storing static web assets (if provisioned)."
  value       = try(module.web[0].bucket_name, null)
}

output "web_domain" {
  description = "Fully qualified domain name served by CloudFront (if provisioned)."
  value       = try(module.web[0].full_domain, null)
}

output "web_cloudfront_domain" {
  description = "CloudFront distribution domain name for the web front-end (if provisioned)."
  value       = try(module.web[0].cloudfront_domain_name, null)
}

output "web_url" {
  description = "Full URL of the web front-end, if deployed."
  value       = length(module.web) > 0 ? try(module.web[0].web_url, null) : null
}

# Security outputs
output "jwt_secret_parameter_name" {
  description = "SSM Parameter Store name containing JWT secret."
  value       = module.security.jwt_secret_parameter_name
}

output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL protecting the API."
  value       = module.security.waf_web_acl_arn
}

output "waf_web_acl_name" {
  description = "Name of the WAF Web ACL."
  value       = module.security.waf_web_acl_name
}

output "authorizer_function_name" {
  description = "Name of the Lambda authorizer function (if enabled)."
  value       = var.enable_authentication && length(module.authorizer) > 0 ? module.authorizer[0].function_name : null
}

output "authentication_enabled" {
  description = "Whether JWT authentication is enabled."
  value       = var.enable_authentication
}

output "waf_enabled" {
  description = "Whether AWS WAF protection is enabled."
  value       = var.enable_waf
}

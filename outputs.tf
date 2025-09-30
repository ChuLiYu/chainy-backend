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

output "api_key_id" {
  description = "API Key ID for authentication."
  value       = module.api.api_key_id
  sensitive   = true
}

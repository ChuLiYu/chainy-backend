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

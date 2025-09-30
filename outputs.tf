# Key values surfaced after deployment for testing and integrations.

output "api_endpoint" {
  description = "HTTP API base URL for invoking Chainy endpoints."
  value       = module.api.api_endpoint
}

output "links_table_name" {
  description = "DynamoDB table storing short links."
  value       = module.db.table_name
}

output "click_events_bucket" {
  description = "S3 bucket receiving click events from Firehose."
  value       = module.events.bucket_name
}

output "event_bus_name" {
  description = "EventBridge bus used for Chainy domain events."
  value       = module.events.event_bus_name
}

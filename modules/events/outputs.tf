# Share event pipeline identifiers with caller modules.

output "event_bus_name" {
  description = "EventBridge bus name receiving Chainy events."
  value       = aws_cloudwatch_event_bus.chainy.name
}

output "event_bus_arn" {
  description = "ARN of the Chainy EventBridge bus."
  value       = aws_cloudwatch_event_bus.chainy.arn
}

output "firehose_name" {
  description = "Kinesis Firehose delivery stream name for click events."
  value       = aws_kinesis_firehose_delivery_stream.click_events.name
}

output "firehose_arn" {
  description = "ARN of the click events Firehose stream."
  value       = aws_kinesis_firehose_delivery_stream.click_events.arn
}

output "bucket_name" {
  description = "S3 bucket name storing click events."
  value       = aws_s3_bucket.click_events.bucket
}

output "bucket_arn" {
  description = "ARN of the click events S3 bucket."
  value       = aws_s3_bucket.click_events.arn
}

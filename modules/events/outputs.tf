# Share the event storage bucket details with parent modules.

output "bucket_name" {
  description = "S3 bucket name storing Chainy domain events."
  value       = aws_s3_bucket.events.bucket
}

output "bucket_arn" {
  description = "ARN of the Chainy events S3 bucket."
  value       = aws_s3_bucket.events.arn
}

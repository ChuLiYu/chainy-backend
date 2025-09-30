output "state_bucket_name" {
  description = "Name of the S3 bucket storing Terraform remote state."
  value       = aws_s3_bucket.tf_state.id
}

output "lock_table_name" {
  description = "Name of the DynamoDB table used for Terraform state locking."
  value       = aws_dynamodb_table.tf_lock.name
}

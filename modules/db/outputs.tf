# Share table identifiers with parent modules.

output "table_name" {
  description = "Name of the DynamoDB table storing chainy links."
  value       = aws_dynamodb_table.links.name
}

output "table_arn" {
  description = "ARN of the DynamoDB table storing chainy links."
  value       = aws_dynamodb_table.links.arn
}

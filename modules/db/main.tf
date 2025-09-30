# Derive a predictable DynamoDB table name from project + environment.
locals {
  table_name = "${var.project}-${var.environment}-chainy-links"
}

# DynamoDB table stores each short code document.
aws_dynamodb_table "links" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "code"

  attribute {
    name = "code"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    "Name" = local.table_name
  })
}

# Users table for Google OAuth authentication
locals {
  users_table_name = "${var.project}-${var.environment}-chainy-users"
}

# DynamoDB table for storing user information
resource "aws_dynamodb_table" "users" {
  name         = local.users_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  # Global Secondary Index for email lookups
  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    "Name" = local.users_table_name
  })
}

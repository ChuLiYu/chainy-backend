# Pin Terraform core and providers so every collaborator uses the same tooling.
terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }

  # Configure remote state storage to keep plans consistent across machines.
  backend "s3" {
    bucket         = "REPLACE_WITH_CHAINY_TF_STATE_BUCKET"
    key            = "env/chainy.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "REPLACE_WITH_CHAINY_TF_LOCKS_TABLE"
    encrypt        = true
  }
}

# Primary AWS provider used by most resources in this stack.
provider "aws" {
  region = var.region
}

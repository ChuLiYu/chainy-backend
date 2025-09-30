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
    bucket         = "chainy-terraform-state-lui-20240930"
    key            = "env/chainy.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "chainy-terraform-locks"
    encrypt        = true
  }
}

# Primary AWS provider used by most resources in this stack.
provider "aws" {
  region = var.region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

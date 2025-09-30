# Global tags and absolute paths derived once for reuse.
locals {
  tags = merge({
    Project     = var.project
    Environment = var.environment
  }, var.extra_tags)

  redirect_source_dir = abspath(var.redirect_build_dir)
  create_source_dir   = abspath(var.create_build_dir)
}

# Provision the DynamoDB table that stores short link metadata.
module "db" {
  source      = "./modules/db"
  project     = var.project
  environment = var.environment
  tags        = local.tags
}

# S3 bucket storing raw Chainy domain events for analytics.
module "events" {
  source         = "./modules/events"
  project        = var.project
  environment    = var.environment
  tags           = local.tags
  retention_days = var.click_events_retention_days
}

# Lambda functions for redirecting and managing links, plus IAM roles.
module "lambda" {
  source      = "./modules/lambda"
  project     = var.project
  environment = var.environment
  tags        = local.tags

  table_name = module.db.table_name
  table_arn  = module.db.table_arn

  events_bucket_name = module.events.bucket_name

  redirect_source_dir = local.redirect_source_dir
  create_source_dir   = local.create_source_dir

  log_retention_in_days  = var.log_retention_in_days
  additional_environment = var.lambda_additional_environment
}

# HTTP API Gateway exposing redirect and CRUD routes.
module "api" {
  source      = "./modules/api"
  project     = var.project
  environment = var.environment
  tags        = local.tags

  redirect_lambda_arn  = module.lambda.redirect_lambda_arn
  redirect_lambda_name = module.lambda.redirect_lambda_name
  create_lambda_arn    = module.lambda.create_lambda_arn
  create_lambda_name   = module.lambda.create_lambda_name
}

module "web" {
  count  = var.web_domain == null ? 0 : 1
  source = "./modules/web"
  providers = {
    aws.us_east_1 = aws.us_east_1
  }

  project        = var.project
  environment    = var.environment
  tags           = local.tags
  domain         = var.web_domain
  subdomain      = var.web_subdomain
  hosted_zone_id = var.web_hosted_zone_id
  price_class    = var.web_price_class
}

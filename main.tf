# Global tags and absolute paths derived once for reuse.
locals {
  tags = merge({
    Project     = var.project
    Environment = var.environment
  }, var.extra_tags)

  redirect_source_dir = abspath(var.redirect_build_dir)
  create_source_dir   = abspath(var.create_build_dir)

  hash_salt_parameter_name = var.hash_salt_parameter_name != null ? var.hash_salt_parameter_name : "/chainy/${var.environment}/CHAINY_HASH_SALT"
  ip_salt_parameter_name   = var.ip_hash_salt_parameter_name != null ? var.ip_hash_salt_parameter_name : "/chainy/${var.environment}/CHAINY_IP_HASH_SALT"

  lambda_environment = merge(var.lambda_additional_environment, {
    CHAINY_HASH_SALT_PARAM    = local.hash_salt_parameter_name
    CHAINY_IP_HASH_SALT_PARAM = local.ip_salt_parameter_name
  })
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

# Security module: SSM parameters, WAF, and security configurations.
module "security" {
  source      = "./modules/security"
  project     = var.project
  environment = var.environment
  tags        = local.tags

  jwt_secret          = var.jwt_secret
  rate_limit_per_5min = var.waf_rate_limit_per_5min
  blocked_countries   = var.waf_blocked_countries
  log_retention_days  = var.log_retention_in_days

  # API Gateway ARN will be set after API module is created
  api_gateway_arn = var.enable_waf ? module.api.api_arn : ""
}

# Lambda Authorizer for JWT authentication (optional).
module "authorizer" {
  count  = var.enable_authentication ? 1 : 0
  source = "./modules/authorizer"

  project     = var.project
  environment = var.environment
  tags        = local.tags

  lambda_zip_path           = "${path.module}/modules/authorizer/build/authorizer.zip"
  jwt_secret_parameter_name = module.security.jwt_secret_parameter_name
  jwt_secret_parameter_arn  = module.security.jwt_secret_parameter_arn
  log_retention_days        = var.log_retention_in_days
}

# Google OAuth Authentication Lambda (optional).
module "google_auth" {
  count  = var.google_client_id != "" ? 1 : 0
  source = "./modules/auth"

  project     = var.project
  environment = var.environment
  tags        = local.tags

  jwt_secret_parameter_name = module.security.jwt_secret_parameter_name
  jwt_secret_parameter_arn  = module.security.jwt_secret_parameter_arn
  users_table_name          = var.users_table_name
  users_table_arn           = var.users_table_arn
  google_client_id          = var.google_client_id
  google_client_secret      = var.google_client_secret
  google_redirect_uri       = var.google_redirect_uri
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

  log_retention_in_days       = var.log_retention_in_days
  additional_environment      = local.lambda_environment
  hash_salt_parameter_name    = local.hash_salt_parameter_name
  ip_hash_salt_parameter_name = local.ip_salt_parameter_name
  hash_salt_fallback          = var.hash_salt_fallback
  ip_hash_salt_fallback       = var.ip_hash_salt_fallback
  web_domain                  = var.web_domain
  web_subdomain               = var.web_subdomain
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

  # Authentication configuration
  enable_authentication  = var.enable_authentication
  authorizer_lambda_arn  = var.enable_authentication && length(module.authorizer) > 0 ? module.authorizer[0].invoke_arn : ""
  authorizer_lambda_name = var.enable_authentication && length(module.authorizer) > 0 ? module.authorizer[0].function_name : ""

  # Google Auth configuration
  google_auth_lambda_arn  = var.google_client_id != "" && length(module.google_auth) > 0 ? module.google_auth[0].function_invoke_arn : ""
  google_auth_lambda_name = var.google_client_id != "" && length(module.google_auth) > 0 ? module.google_auth[0].function_name : ""
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

  # Pass API Gateway domain for short link routing
  api_domain_name = trimprefix(module.api.api_endpoint, "https://")
}

# Budget monitoring and cost control (optional).
module "budget" {
  count  = var.enable_budget_monitoring ? 1 : 0
  source = "./modules/budget"

  project     = var.project
  environment = var.environment
  tags        = local.tags

  monthly_budget_limit    = var.monthly_budget_limit
  daily_cost_threshold    = var.daily_cost_threshold
  alert_emails            = var.budget_alert_emails
  primary_alert_email     = length(var.budget_alert_emails) > 0 ? var.budget_alert_emails[0] : ""
  enable_sns_alerts       = length(var.budget_alert_emails) > 0
  enable_daily_cost_alarm = length(var.budget_alert_emails) > 0
}

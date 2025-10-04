# Environment Configuration Template

This template shows the structure for environment-specific configuration files without exposing sensitive data.

## Development Environment (terraform.tfvars.development)

```hcl
# Google OAuth Configuration
google_client_id     = "YOUR_GOOGLE_CLIENT_ID"
google_client_secret = "YOUR_GOOGLE_CLIENT_SECRET"
google_redirect_uri  = "http://localhost:3000"

# AWS Configuration
aws_region = "ap-northeast-1"
environment = "dev"

# Domain Configuration
domain = "localhost:3000"
protocol = "http"

# Database Configuration
dynamodb_table_name = "chainy-dev-links"
users_table_name = "chainy-dev-users"

# Security Configuration
jwt_secret_parameter_name = "/chainy/dev/jwt-secret"
waf_enabled = false

# Cost Optimization
cost_optimization = false
debug_mode = true
log_level = "DEBUG"
```

## Production Environment (terraform.tfvars.production)

```hcl
# Google OAuth Configuration
google_client_id     = "YOUR_GOOGLE_CLIENT_ID"
google_client_secret = "YOUR_GOOGLE_CLIENT_SECRET"
google_redirect_uri  = "https://chainy.luichu.dev"

# AWS Configuration
aws_region = "ap-northeast-1"
environment = "prod"

# Domain Configuration
domain = "chainy.luichu.dev"
protocol = "https"

# Database Configuration
dynamodb_table_name = "chainy-prod-links"
users_table_name = "chainy-prod-users"

# Security Configuration
jwt_secret_parameter_name = "/chainy/prod/jwt-secret"
waf_enabled = true

# Cost Optimization
cost_optimization = true
debug_mode = false
log_level = "ERROR"
```

## Environment Manager Script Template (config/env-manager.sh)

```bash
#!/bin/bash

# Environment Manager Script Template
# This script manages environment-specific configurations

set -e

ENVIRONMENT=${1:-"dev"}

case $ENVIRONMENT in
    "dev")
        echo "Setting up development environment..."
        # Development-specific setup
        ;;
    "prod")
        echo "Setting up production environment..."
        # Production-specific setup
        ;;
    *)
        echo "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

echo "Environment $ENVIRONMENT configured successfully"
```

## Security Notes

1. **Never commit actual secrets** - Use placeholder values in templates
2. **Use AWS Parameter Store** - Store secrets in AWS Parameter Store
3. **Environment variables** - Use environment variables for sensitive data
4. **Local configuration** - Keep actual secrets in local files only
5. **Team sharing** - Share secrets through secure channels, not git

## Setup Instructions

1. Copy the template files to create your actual configuration
2. Replace placeholder values with actual secrets
3. Ensure these files are in .gitignore
4. Use secure methods to share secrets with team members

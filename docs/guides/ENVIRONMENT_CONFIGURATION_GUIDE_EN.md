# Environment Configuration Guide

This guide explains how to use the environment configuration system for managing different deployment environments.

## Overview

The environment configuration system allows you to manage different environments (development, staging, production) with centralized settings and easy switching between them.

## Configuration Files

### `config/environments.toml`

This file contains all environment-specific settings:

```toml
[development]
environment = "dev"
region = "ap-northeast-1"
domain = "localhost:3000"
protocol = "http"
api_endpoint = "https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com"
google_redirect_uri = "http://localhost:3000"
log_level = "DEBUG"
debug_mode = true
cost_optimization = false

[production]
environment = "prod"
region = "ap-northeast-1"
domain = "chainy.luichu.dev"
protocol = "https"
api_endpoint = "https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com"
google_redirect_uri = "https://chainy.luichu.dev"
log_level = "ERROR"
debug_mode = false
cost_optimization = true
```

## Management Scripts

### `config/env-manager.sh`

This script provides commands for managing environment configurations:

```bash
# List all available environments
./config/env-manager.sh list

# Show details for a specific environment
./config/env-manager.sh show dev

# Generate configuration files for an environment
./config/env-manager.sh generate dev

# Deploy a specific environment
./config/env-manager.sh deploy prod
```

### `env-switch.sh`

This convenience script provides quick access to common operations:

```bash
# Switch to development environment
./env-switch.sh dev

# Switch to production environment
./env-switch.sh prod

# Deploy current environment
./env-switch.sh deploy

# Start development server
./env-switch.sh dev-server
```

## Environment Variables

The system automatically loads environment variables based on the selected environment:

### Frontend Variables (Vite)

- `VITE_ENVIRONMENT`: Current environment name
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `VITE_CHAINY_API`: API endpoint URL
- `VITE_GOOGLE_REDIRECT_URI`: OAuth redirect URI
- `VITE_DEBUG_MODE`: Enable debug mode
- `VITE_CORS_DEBUG`: Enable CORS debugging

### Backend Variables (Terraform)

- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GOOGLE_REDIRECT_URI`: OAuth redirect URI
- `JWT_SECRET`: JWT signing secret
- `LOG_LEVEL`: Logging level
- `DEBUG_MODE`: Debug mode flag

## Usage Examples

### Development Workflow

```bash
# Switch to development environment
./env-switch.sh dev

# Start development server
npm run dev

# Make changes and test locally
# ...

# Deploy to development
./env-switch.sh deploy dev
```

### Production Deployment

```bash
# Switch to production environment
./env-switch.sh prod

# Deploy backend
cd chainy && terraform apply

# Deploy frontend
cd chainy-web && npm run build
aws s3 sync dist/ s3://chainy-prod-web/ --delete
aws cloudfront create-invalidation --distribution-id E1QBDOEH9EVM6M --paths "/*"
```

### Environment-Specific Configuration

```bash
# Show current environment settings
./config/env-manager.sh show dev

# Generate .env file for development
./config/env-manager.sh generate dev

# Deploy specific environment
./config/env-manager.sh deploy prod
```

## Best Practices

1. **Always use environment-specific configurations** - Never hardcode environment values
2. **Test in development first** - Always test changes in development before production
3. **Use descriptive environment names** - Clear naming helps avoid confusion
4. **Keep secrets secure** - Use AWS Parameter Store or similar for sensitive data
5. **Document environment differences** - Keep track of what differs between environments

## Troubleshooting

### Common Issues

1. **Environment not found**: Check that the environment exists in `environments.toml`
2. **Variables not loading**: Ensure the environment manager script has execute permissions
3. **Deployment failures**: Check that all required environment variables are set

### Debug Mode

Enable debug mode to see detailed information about environment loading:

```bash
# Enable debug mode
export DEBUG_MODE=true

# Run environment operations
./env-switch.sh dev
```

## Migration from Chinese Documentation

This guide replaces the previous Chinese documentation (`ENVIRONMENT_CONFIGURATION_GUIDE.md`) with comprehensive English documentation. All functionality remains the same, but now with proper English documentation for international development teams.

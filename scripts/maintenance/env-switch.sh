#!/bin/bash

# Quick Environment Switcher for Chainy
# Simple script to quickly switch between development and production

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show current environment
show_current() {
    if [ -f "chainy/terraform.tfvars" ]; then
        ENV=$(grep "^environment" chainy/terraform.tfvars | cut -d'"' -f2)
        DOMAIN=$(grep "^google_redirect_uri" chainy/terraform.tfvars | cut -d'"' -f2 | cut -d'/' -f3)
        print_status "Current environment: $ENV (Domain: $DOMAIN)"
    else
        print_warning "No active environment configuration found"
    fi
}

# Function to switch to development
switch_dev() {
    print_status "Switching to development environment..."
    
    # Use environment manager
    ./config/env-manager.sh switch development
    
    print_status "Development environment activated"
    print_status "Local development server: http://localhost:3000"
    print_status "Google OAuth redirect: http://localhost:3000"
}

# Function to switch to production
switch_prod() {
    print_status "Switching to production environment..."
    
    # Use environment manager
    ./config/env-manager.sh switch production
    
    print_status "Production environment activated"
    print_status "Production URL: https://chainy.luichu.dev"
    print_status "Google OAuth redirect: https://chainy.luichu.dev"
}

# Function to deploy current environment
deploy_current() {
    if [ -f "chainy/terraform.tfvars" ]; then
        ENV=$(grep "^environment" chainy/terraform.tfvars | cut -d'"' -f2)
        print_status "Deploying $ENV environment..."
        ./config/env-manager.sh deploy "$ENV"
    else
        print_error "No environment configuration found"
        exit 1
    fi
}

# Function to start development server
start_dev() {
    print_status "Starting development server..."
    cd chainy-web
    npm run dev
}

# Function to show help
show_help() {
    echo "Chainy Environment Quick Switcher"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  dev, development    Switch to development environment"
    echo "  prod, production    Switch to production environment"
    echo "  current             Show current environment"
    echo "  deploy              Deploy current environment"
    echo "  start               Start development server"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev              # Switch to development"
    echo "  $0 prod             # Switch to production"
    echo "  $0 current          # Show current environment"
    echo "  $0 deploy           # Deploy current environment"
    echo "  $0 start            # Start dev server"
}

# Main script logic
case "${1:-}" in
    "dev"|"development")
        switch_dev
        ;;
    "prod"|"production")
        switch_prod
        ;;
    "current")
        show_current
        ;;
    "deploy")
        deploy_current
        ;;
    "start")
        start_dev
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    "")
        show_current
        echo ""
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

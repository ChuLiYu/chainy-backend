# Quick Setup Instructions

## For New Team Members

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chainy
   ```

2. **Set up local configuration**
   ```bash
   # Edit terraform configuration with your actual values
   nano chainy/terraform.tfvars
   
   # Edit environment variables
   nano .env
   ```

3. **Get sensitive values**
   - Contact team lead for Google OAuth credentials
   - Get AWS credentials from team lead
   - Update local files with actual values

4. **Test setup**
   ```bash
   # Test development environment
   cd chainy
   terraform plan -var-file="terraform.tfvars.development"
   ```

## Security Notes

- Never commit actual secrets to git
- Use placeholder values in templates
- Keep sensitive data in local files only
- Share secrets through secure channels

## Files to Edit Locally

- `chainy/terraform.tfvars` - Main configuration
- `chainy/terraform.tfvars.development` - Development config
- `chainy/terraform.tfvars.production` - Production config
- `config/env-manager.sh` - Environment manager
- `.env` - Environment variables

All these files are ignored by git and safe to edit locally.

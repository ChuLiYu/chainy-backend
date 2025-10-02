# Local Version Control Setup Guide

This guide explains how to set up local version control for sensitive configuration files while keeping them secure.

## 🔒 Security Principles

1. **Never commit secrets** - Sensitive data should never be in version control
2. **Use templates** - Provide templates with placeholder values
3. **Local configuration** - Keep actual secrets in local files only
4. **Secure sharing** - Share secrets through secure channels

## 📁 Local Configuration Structure

```
chainy/
├── terraform.tfvars                    # Local development config (ignored)
├── terraform.tfvars.development        # Local dev config (ignored)
├── terraform.tfvars.production         # Local prod config (ignored)
└── terraform.tfvars.example            # Template (committed)

config/
├── env-manager.sh                      # Local script (ignored)
└── env-manager.sh.example              # Template (committed)
```

## 🛠️ Setup Instructions

### 1. Create Local Configuration Files

```bash
# Copy templates to create local configs
cp chainy/terraform.tfvars.example chainy/terraform.tfvars
cp chainy/terraform.tfvars.example chainy/terraform.tfvars.development
cp chainy/terraform.tfvars.example chainy/terraform.tfvars.production
cp config/env-manager.sh.example config/env-manager.sh

# Edit with actual values
nano chainy/terraform.tfvars
nano chainy/terraform.tfvars.development
nano chainy/terraform.tfvars.production
nano config/env-manager.sh
```

### 2. Verify .gitignore is Working

```bash
# Check that sensitive files are ignored
git status --ignored | grep terraform.tfvars
git status --ignored | grep env-manager.sh

# Should show these files as ignored
```

### 3. Test Local Configuration

```bash
# Test development environment
cd chainy
terraform plan -var-file="terraform.tfvars.development"

# Test production environment
terraform plan -var-file="terraform.tfvars.production"
```

## 🔐 Secret Management Best Practices

### Use AWS Parameter Store

```bash
# Store secrets in AWS Parameter Store
aws ssm put-parameter \
  --name "/chainy/prod/google-client-secret" \
  --value "GOCSPX-your-actual-secret" \
  --type "SecureString"

# Retrieve secrets in Terraform
data "aws_ssm_parameter" "google_client_secret" {
  name = "/chainy/prod/google-client-secret"
}
```

### Environment Variables

```bash
# Set environment variables
export GOOGLE_CLIENT_SECRET="GOCSPX-your-actual-secret"
export GOOGLE_CLIENT_ID="your-client-id"

# Use in scripts
echo "Client ID: $GOOGLE_CLIENT_ID"
```

### Local .env Files

```bash
# Create .env file (ignored by git)
cat > .env << EOF
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
AWS_REGION=ap-northeast-1
EOF

# Source in scripts
source .env
```

## 📋 Team Collaboration

### For New Team Members

1. **Clone repository** - Get the code without secrets
2. **Copy templates** - Use provided templates
3. **Get secrets** - Receive secrets through secure channel
4. **Configure locally** - Set up local configuration files
5. **Test setup** - Verify everything works locally

### Secure Secret Sharing

1. **Encrypted communication** - Use encrypted channels (Signal, encrypted email)
2. **Temporary access** - Provide temporary access to AWS Parameter Store
3. **Documentation** - Document where secrets are stored
4. **Rotation** - Regularly rotate secrets

## 🚨 Security Checklist

- [ ] All sensitive files are in .gitignore
- [ ] Templates exist with placeholder values
- [ ] Local configuration files are created
- [ ] Secrets are stored in AWS Parameter Store
- [ ] Team members have secure access to secrets
- [ ] Regular secret rotation is planned
- [ ] No secrets in commit history

## 🔍 Verification Commands

```bash
# Check for sensitive data in tracked files
git ls-files | xargs grep -l "GOCSPX-\|client_secret\|password" || echo "No sensitive data found"

# Check ignored files
git status --ignored

# Verify .gitignore is working
echo "test-secret" > test-secret.txt
git status  # Should not show test-secret.txt
rm test-secret.txt
```

## 📚 Additional Resources

- [AWS Parameter Store Documentation](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [Git Security Best Practices](https://git-scm.com/docs/gitignore)
- [Terraform Security Best Practices](https://www.terraform.io/docs/cloud/guides/security.html)

---

**Remember**: Security is everyone's responsibility. When in doubt, ask before committing sensitive data.

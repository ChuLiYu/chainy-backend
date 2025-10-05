# AWS Automation Tools Usage Guide

## Overview

This document provides comprehensive usage instructions for the automation tools created to manage AWS permissions, deployments, and infrastructure for the Chainy short URL service.

## 1. Permission Analysis Script

### File: `scripts/analyze-permissions.sh`

**Purpose:** Automatically analyze Lambda function code to identify required AWS permissions.

**Usage:**
```bash
# Run permission analysis
./scripts/analyze-permissions.sh
```

**Output:**
- Lists all DynamoDB operations used in Lambda functions
- Identifies S3 operations
- Shows SSM parameter access patterns
- Generates recommended IAM permissions

**Example Output:**
```
🔍 分析 Lambda 函數的 AWS 權限需求...
📊 DynamoDB 操作分析：
6:  DeleteCommand,
7:  GetCommand,
8:  PutCommand,
9:  ScanCommand,
10: UpdateCommand,
📊 S3 操作分析：
📊 SSM 操作分析：
✅ 權限分析完成！
```

**When to Use:**
- Before deploying new Lambda functions
- When adding new AWS service integrations
- During security audits
- When troubleshooting permission errors

## 2. Permission Verification Script

### File: `scripts/verify-permissions.sh`

**Purpose:** Verify that all Lambda functions have the correct IAM permissions configured.

**Usage:**
```bash
# Verify all Lambda permissions
./scripts/verify-permissions.sh
```

**Prerequisites:**
- AWS CLI configured with appropriate credentials
- Lambda functions already deployed

**Output:**
- Shows IAM policies for each Lambda function
- Displays DynamoDB permissions
- Lists other AWS service permissions

**Example Output:**
```
🔍 驗證 AWS 權限配置...
📊 檢查 Create Lambda DynamoDB 權限：
|  dynamodb:DeleteItem  |
|  dynamodb:GetItem     |
|  dynamodb:PutItem     |
|  dynamodb:Scan        |
|  dynamodb:UpdateItem  |
✅ 權限驗證完成！
```

**When to Use:**
- After Terraform deployments
- When troubleshooting AccessDenied errors
- During security compliance checks
- Before production releases

## 3. One-Click Deployment Script

### File: `scripts/deploy.sh`

**Purpose:** Automate the complete deployment process for the Chainy application.

**Usage:**
```bash
# Deploy entire application
./scripts/deploy.sh
```

**Prerequisites:**
- Terraform installed
- AWS CLI configured
- npm installed
- Appropriate AWS permissions

**What It Does:**
1. **Infrastructure Deployment:**
   - Runs `terraform init`
   - Executes `terraform plan`
   - Applies infrastructure changes with `terraform apply -auto-approve`

2. **Frontend Build:**
   - Installs npm dependencies
   - Builds production bundle with `npm run build`

3. **Frontend Deployment:**
   - Syncs built files to S3 bucket
   - Creates CloudFront cache invalidation

**Output:**
```
🚀 開始部署 Chainy 應用程式...
🔍 檢查必要工具...
🏗️ 部署 AWS 基礎設施...
🎨 構建前端應用程式...
📤 部署前端到 S3...
🔄 清除 CloudFront 緩存...
✅ 部署完成！
🌐 應用程式網址: https://chainy.luichu.dev
```

**When to Use:**
- Production deployments
- After major code changes
- When setting up new environments
- For disaster recovery

## 4. CI/CD GitHub Actions Workflow

### File: `.github/workflows/deploy.yml`

**Purpose:** Automate deployments through GitHub Actions when code is pushed to the main branch.

**Trigger Conditions:**
- Push to `main` branch
- Changes in `chainy/**` or `chainy-web/**` directories
- Pull requests to `main` branch

**Workflow Steps:**

### Job 1: `terraform-plan`
- Checks out code
- Sets up Terraform
- Runs `terraform plan`
- Uploads plan as artifact

### Job 2: `deploy` (only on main branch)
- Downloads terraform plan
- Sets up AWS credentials
- Deploys infrastructure
- Builds and deploys frontend

**Required GitHub Secrets:**
```yaml
AWS_ACCESS_KEY_ID: Your AWS access key
AWS_SECRET_ACCESS_KEY: Your AWS secret key
CLOUDFRONT_DISTRIBUTION_ID: CloudFront distribution ID
```

**Setup Instructions:**
1. Go to GitHub repository Settings → Secrets and variables → Actions
2. Add the required secrets listed above
3. Push changes to trigger the workflow

**When to Use:**
- Automatic deployments on code changes
- Continuous integration testing
- Production release automation
- Team collaboration workflows

## 5. Integration with Existing Workflow

### Terraform Integration

All automation scripts work seamlessly with the existing Terraform infrastructure:

```bash
# Manual deployment workflow
cd chainy
terraform init
terraform plan
terraform apply

# Automated deployment workflow
./scripts/deploy.sh
```

### AWS CLI Integration

Scripts use standard AWS CLI commands and respect existing configurations:

```bash
# Check AWS configuration
aws configure list

# Verify Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `chainy`)]'
```

### Frontend Integration

The deployment script integrates with the existing Vite build process:

```bash
# Manual frontend deployment
cd chainy-web
npm install
npm run build
aws s3 sync dist/ s3://chainy-prod-web --delete

# Automated frontend deployment
./scripts/deploy.sh
```

## 6. Troubleshooting Automation Tools

### Common Issues and Solutions

#### Permission Analysis Script Issues

**Issue:** Script not finding Lambda functions
```bash
# Solution: Ensure you're in the correct directory
cd /Users/liyu/Programing/aws
./scripts/analyze-permissions.sh
```

**Issue:** No output from permission analysis
```bash
# Solution: Check if Lambda files exist
ls -la chainy/handlers/
```

#### Permission Verification Script Issues

**Issue:** AWS CLI not configured
```bash
# Solution: Configure AWS CLI
aws configure
```

**Issue:** Access denied when checking IAM policies
```bash
# Solution: Ensure IAM permissions for policy reading
aws iam get-role-policy --role-name test-role --policy-name test-policy
```

#### Deployment Script Issues

**Issue:** Terraform not found
```bash
# Solution: Install Terraform
brew install terraform  # macOS
# or download from https://terraform.io
```

**Issue:** S3 sync fails
```bash
# Solution: Check S3 bucket permissions
aws s3 ls s3://chainy-prod-web
```

#### GitHub Actions Issues

**Issue:** Workflow not triggering
- Check if files are in correct paths (`chainy/**` or `chainy-web/**`)
- Verify branch name is `main`
- Check GitHub Actions tab for error messages

**Issue:** AWS credentials not working
- Verify GitHub secrets are correctly set
- Check AWS IAM user permissions
- Ensure region is correctly specified

## 7. Best Practices

### Security Considerations

1. **Never commit AWS credentials:**
   ```bash
   # Use environment variables or AWS profiles
   export AWS_ACCESS_KEY_ID=your_key
   export AWS_SECRET_ACCESS_KEY=your_secret
   ```

2. **Use least privilege principle:**
   - Only grant necessary permissions
   - Regularly audit IAM policies
   - Use temporary credentials when possible

3. **Secure GitHub secrets:**
   - Use GitHub's encrypted secrets
   - Rotate credentials regularly
   - Limit secret access to necessary workflows

### Performance Optimization

1. **Parallel execution:**
   ```bash
   # Run multiple scripts in parallel
   ./scripts/analyze-permissions.sh &
   ./scripts/verify-permissions.sh &
   wait
   ```

2. **Caching:**
   - Terraform state caching
   - npm package caching in CI/CD
   - AWS CLI response caching

3. **Resource cleanup:**
   ```bash
   # Clean up temporary files
   rm -f chainy/tfplan
   rm -rf chainy-web/node_modules/.cache
   ```

### Monitoring and Logging

1. **Enable CloudWatch logging:**
   ```bash
   # Check Lambda logs
   aws logs describe-log-groups --log-group-name-prefix /aws/lambda/chainy
   ```

2. **Monitor deployment status:**
   ```bash
   # Check CloudFront distribution status
   aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID
   ```

3. **Set up alerts:**
   - CloudWatch alarms for Lambda errors
   - SNS notifications for deployment failures
   - GitHub Actions status notifications

## 8. Maintenance and Updates

### Regular Maintenance Tasks

1. **Weekly:**
   - Run permission verification script
   - Check CloudWatch logs for errors
   - Review GitHub Actions workflow runs

2. **Monthly:**
   - Update automation scripts
   - Review and rotate AWS credentials
   - Audit IAM permissions

3. **Quarterly:**
   - Update Terraform and AWS CLI versions
   - Review and update GitHub Actions workflows
   - Security audit of all automation tools

### Script Updates

When updating automation scripts:

1. **Test in development environment first**
2. **Update documentation**
3. **Version control all changes**
4. **Notify team of changes**

### Version Compatibility

Current tool versions:
- Terraform: 1.5.0+
- AWS CLI: 2.0+
- Node.js: 18+
- GitHub Actions: v3

## Conclusion

These automation tools provide a comprehensive solution for managing AWS permissions and deployments for the Chainy short URL service. By following the usage guidelines and best practices outlined in this document, you can:

- Reduce manual errors
- Improve deployment consistency
- Enhance security through automated permission management
- Streamline the development workflow
- Ensure reliable production deployments

For additional support or questions about these tools, refer to the troubleshooting section or consult the main project documentation.

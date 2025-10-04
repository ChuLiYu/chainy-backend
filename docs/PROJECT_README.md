# Chainy URL Shortener

A modern, serverless URL shortener built with AWS Lambda, DynamoDB, and React, featuring Google OAuth 2.0 authentication.

## 🚀 Features

- **Serverless Architecture**: Built on AWS Lambda, DynamoDB, and API Gateway
- **Google OAuth 2.0**: Secure authentication with PKCE support
- **Responsive Frontend**: React-based UI with multi-language support
- **Cost Optimized**: Designed for minimal AWS costs (< $1/month)
- **Security**: JWT authentication, WAF protection, and comprehensive monitoring
- **Infrastructure as Code**: Complete Terraform configuration

## 📁 Project Structure

```
aws/
├── chainy/                 # Backend infrastructure and Lambda functions
│   ├── handlers/           # Lambda function handlers
│   ├── modules/           # Terraform modules
│   ├── docs/              # Documentation
│   └── terraform.tfvars   # Configuration (not in git)
├── chainy-web/            # React frontend application
│   ├── src/               # React components and utilities
│   ├── public/            # Static assets
│   └── docs/              # Frontend documentation
└── docs/                  # Project-wide documentation
```

## 🔧 Recent Fixes

### Google OAuth "Invalid OAuth code" Error (October 2025)

**Problem**: Google authentication was failing with "Invalid OAuth code" error due to placeholder client secret.

**Root Cause**: 
```
ERROR Token exchange failed: {
  "error": "invalid_client",
  "error_description": "Unauthorized"
}
```

**Solution**: 
- Updated `GOOGLE_CLIENT_SECRET` from placeholder `"GOCSPX-your_google_client_secret_here"` to actual Google OAuth client secret
- Created comprehensive troubleshooting guide (`GOOGLE_OAUTH_FIX_GUIDE.md`)
- Added automated fix script (`fix-google-oauth.sh`)

**Files Modified**:
- `chainy/terraform.tfvars` - Updated with real Google OAuth client secret
- `GOOGLE_OAUTH_FIX_GUIDE.md` - Added troubleshooting documentation
- `fix-google-oauth.sh` - Created automated fix script

## 🛠️ Quick Start

1. **Configure Google OAuth**:
   ```bash
   # Follow the guide in GOOGLE_OAUTH_FIX_GUIDE.md
   # Or use the automated script:
   ./fix-google-oauth.sh
   ```

2. **Deploy Infrastructure**:
   ```bash
   cd chainy
   terraform init
   terraform apply
   ```

3. **Deploy Frontend**:
   ```bash
   cd chainy-web
   npm install
   npm run build
   # Deploy to S3/CloudFront
   ```

## 📚 Documentation

- [Google OAuth Fix Guide](GOOGLE_OAUTH_FIX_GUIDE.md) - Troubleshooting Google authentication
- [Deployment Guide](chainy/docs/deployment-guide.md) - Complete deployment instructions
- [Security Implementation](chainy/SECURITY_README_EN.md) - Security features and best practices
- [Cost Optimization](chainy/README-COST-OPTIMIZATION.md) - Cost reduction strategies

## 🔒 Security

- Google OAuth 2.0 with PKCE
- JWT token authentication
- AWS WAF protection
- Environment variable encryption
- Comprehensive monitoring and alerting

## 💰 Cost Optimization

- Monthly cost: < $1
- Free tier utilization
- Optimized Lambda cold starts
- Minimal CloudWatch logging
- Cost monitoring and alerts

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](chainy/LICENSE) file for details.

## 🤝 Contributing

Please read [CONTRIBUTING.md](chainy/.github/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📞 Support

For issues and questions:
1. Check the troubleshooting guides in the `docs/` directory
2. Review the [Google OAuth Fix Guide](GOOGLE_OAUTH_FIX_GUIDE.md) for authentication issues
3. Create an issue in the GitHub repository

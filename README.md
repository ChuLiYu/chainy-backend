# Chainy - URL Shortener Service

A modern, secure, and scalable URL shortener service built with AWS serverless architecture.

## 🚀 Features

- **Secure Authentication**: Google OAuth 2.0 integration with JWT tokens
- **Custom Short Codes**: Authenticated users can create custom short codes
- **Note/Title Support**: Add memorable titles to your short URLs
- **Link Management**: View, pin, and delete your short URLs
- **Analytics**: Track click counts and usage statistics
- **Multi-language Support**: English and Chinese interfaces
- **Production Ready**: Fully deployed on AWS with cost optimization

## 🏗️ Architecture

- **Frontend**: React + Vite, deployed on S3 + CloudFront
- **Backend**: AWS Lambda functions with TypeScript
- **Database**: DynamoDB for link storage
- **Authentication**: Google OAuth 2.0 + JWT
- **API Gateway**: RESTful API with CORS support
- **Security**: WAF protection and rate limiting

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- AWS CLI configured
- Terraform 1.0+
- Google Cloud Console project

### Environment Configuration

The project uses a centralized environment configuration system:

```bash
# Switch between environments
./env-switch.sh dev    # Development
./env-switch.sh prod   # Production

# Deploy specific environment
./env-switch.sh deploy dev
```

### Local Development

```bash
# Backend
cd chainy
npm install
npm run package
terraform apply

# Frontend
cd chainy-web
npm install
npm run dev
```

## 📁 Project Structure

```
chainy/                    # Backend Lambda functions
├── handlers/              # API endpoints
├── lib/                   # Shared utilities
├── modules/               # Terraform modules
└── tests/                 # E2E tests

chainy-web/                # Frontend React app
├── src/                   # React components
├── public/                # Static assets
└── dist/                  # Build output

config/                    # Environment configuration
├── environments.toml     # Environment settings
└── env-manager.sh        # Configuration management
```

## 🔧 Configuration

### Environment Variables

The system supports multiple environments with different configurations:

- **Development**: `http://localhost:3000`
- **Production**: `https://chainy.luichu.dev`

### Google OAuth Setup

1. Create a Google Cloud Console project
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Configure authorized redirect URIs:
   - Development: `http://localhost:3000`
   - Production: `https://chainy.luichu.dev`

## 🚀 Deployment

### Production Deployment

```bash
# Deploy backend
cd chainy
terraform apply

# Deploy frontend
cd chainy-web
npm run build
aws s3 sync dist/ s3://chainy-prod-web/ --delete
aws cloudfront create-invalidation --distribution-id E1QBDOEH9EVM6M --paths "/*"
```

### Automated Deployment

Use GitHub Actions for automated deployment:

- **Backend**: `chainy/.github/workflows/deploy.yml`
- **Frontend**: `chainy-web/.github/workflows/deploy.yml`

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **CORS Protection**: Configured for specific origins
- **WAF Integration**: Web Application Firewall protection
- **Rate Limiting**: API rate limiting and throttling
- **Input Validation**: Comprehensive input sanitization

## 💰 Cost Optimization

- **Lambda Cold Start Optimization**: Connection pooling and caching
- **DynamoDB Optimization**: On-demand billing and efficient queries
- **CloudFront Caching**: Reduced origin requests
- **S3 Lifecycle Policies**: Automatic cleanup of old files

## 📊 Monitoring

- **CloudWatch Logs**: Centralized logging
- **CloudWatch Metrics**: Performance monitoring
- **Budget Alerts**: Cost monitoring and alerts
- **Error Tracking**: Comprehensive error handling

## 🧪 Testing

```bash
# Backend tests
cd chainy
npm test

# E2E tests
npm run test:e2e
```

## 📝 API Documentation

### Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Endpoints

- `POST /links` - Create short URL (authenticated)
- `POST /links/anonymous` - Create short URL (anonymous)
- `GET /links` - List user's short URLs (authenticated)
- `GET /links/{code}` - Get short URL details
- `PUT /links/{code}` - Update short URL (authenticated)
- `DELETE /links/{code}` - Delete short URL (authenticated)
- `GET /{code}` - Redirect to target URL

### Request/Response Examples

**Create Short URL:**

```json
POST /links
{
  "target": "https://example.com",
  "code": "custom-code",  // optional
  "note": "My important link"  // optional
}
```

**Response:**

```json
{
  "code": "custom-code",
  "target": "https://example.com",
  "short_url": "https://chainy.luichu.dev/custom-code",
  "note": "My important link",
  "created_at": "2025-10-02T03:00:00.000Z",
  "clicks": 0,
  "pinned": false
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting guides in `/docs`
2. Review the GitHub issues
3. Create a new issue with detailed information

## 📚 Documentation

- [DNS and CloudFront Migration](docs/DNS_CLOUDFRONT_MIGRATION.md)
- [Troubleshooting Guides](docs/troubleshooting/)
- [Security Implementation](docs/security-audit-report.md)
- [Troubleshooting Solutions](docs/TROUBLESHOOTING_SOLUTIONS.md)
- [Security Best Practices](docs/SECURITY_BEST_PRACTICES.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)

## 🔄 Recent Updates

- ✅ Added note/title feature for authenticated users
- ✅ Simplified Google login to single redirect button
- ✅ Implemented comprehensive environment configuration
- ✅ Fixed Google OAuth "Invalid OAuth code" issue
- ✅ Prepared for production deployment
- ✅ Converted all documentation to English
- ✅ Set up GitHub Actions for automated deployment

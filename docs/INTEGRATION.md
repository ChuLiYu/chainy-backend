# Integration Guide

This document explains how to integrate the Chainy frontend with the backend API.

## Prerequisites

1. Deploy the backend infrastructure using Terraform
2. Set up the frontend development environment
3. Configure environment variables

## Backend API Endpoints

The backend provides the following REST API endpoints:

### Create Short Link
```http
POST /links
Content-Type: application/json

{
  "target": "https://example.com",
  "owner": "user123"
}
```

### Resolve Short Link
```http
GET /{code}
```

### Manage Links
```http
GET    /links/{code}      # Get link details
PUT    /links/{code}      # Update link
DELETE /links/{code}      # Delete link
```

## Frontend Configuration

1. Create `.env.local` for development:
   ```bash
   VITE_API_BASE_URL=https://your-api-gateway-url.amazonaws.com
   ```

2. For production, set environment variables in CI/CD:
   ```bash
   VITE_API_BASE_URL=${API_GATEWAY_URL}
   ```

## Error Handling

The API returns standard HTTP status codes:

- 200: Success
- 201: Created
- 301: Redirect
- 400: Bad Request
- 404: Not Found
- 500: Server Error

## Security

1. All requests should use HTTPS
2. API endpoints are public but rate-limited
3. Consider implementing authentication if needed

## Testing

1. Backend: `npm test`
2. Frontend: `npm run test`
3. Integration: Use provided Postman collection

## Deployment

### Backend
```bash
# Deploy infrastructure
terraform init
terraform apply -var-file=prod.tfvars

# Note the outputs:
- api_endpoint
- dynamodb_table
- events_bucket
```

### Frontend
```bash
# Build for production
npm run build

# Deploy to S3/CloudFront
aws s3 sync dist/ s3://your-bucket --delete
```

## Monitoring

- Backend logs: CloudWatch Logs
- Frontend errors: Browser console
- API metrics: CloudWatch Metrics

## Troubleshooting

1. API Connection Issues:
   - Check CORS configuration
   - Verify API Gateway URL
   - Check network requests

2. Deployment Issues:
   - Verify AWS credentials
   - Check CloudWatch Logs
   - Verify environment variables

## Resources

- [Backend API Documentation](./docs/api.md)
- [Frontend Development Guide](./docs/DEVELOPMENT.md)
- [AWS Services Overview](./docs/aws.md)
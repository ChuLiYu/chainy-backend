# Google OAuth 2.0 Integration Guide

This guide explains how to integrate Google OAuth 2.0 authentication into the Chainy URL shortener service.

## Capabilities

- Google sign-in: allow users to authenticate with their Google account
- Custom short codes: authenticated users can manage custom aliases
- JWT integration: reuse the existing token based authentication flow
- User management: automatically create and update user profiles
- CORS support: enable cross origin requests from permitted domains

## Quick Start

### 1. Configure Google OAuth 2.0

1. Open the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Enable the Google Identity APIs you need
4. Create an OAuth 2.0 client ID
5. Add authorized JavaScript origins and redirect URIs, for example:
   - Development origin: `http://localhost:5173`
   - Production origin: `https://your-domain.com`

### 2. Deploy the Backend

```bash
# Provide the Google client ID
export GOOGLE_CLIENT_ID="your_google_client_id_here"

# Run the deployment helper
./deploy-google-auth.sh
```

### 3. Configure the Frontend

```bash
cd chainy-web
cp env.example .env.local

cat <<'ENV' >> .env.local
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_CHAINY_API=https://your-api-gateway-url
ENV

npm install
npm run dev
```

## Architecture

### Frontend

- Google Identity Services handles the Google sign-in flow
- The existing JWT utilities store and use the returned token
- React components manage login state and UI feedback

### Backend

- A Google auth Lambda function validates Google ID tokens
- DynamoDB stores user records
- The backend issues Chainy JWT tokens after successful verification
- API Gateway exposes the `/auth/google` endpoint

### Data Flow

```
1. User clicks the Google sign-in button
2. Google returns an ID token to the browser
3. The frontend POSTs the token to /auth/google
4. The backend verifies the token with Google
5. The backend creates or updates the user record
6. A Chainy JWT token is generated and returned
7. The frontend stores the JWT
8. The user can manage custom short links
```

## API Endpoints

### Google Authentication

```
POST /auth/google
Content-Type: application/json

{
  "googleToken": "google_id_token",
  "provider": "google"
}

Response:
{
  "jwt": "internal_jwt_token",
  "user": {
    "userId": "google_user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "profile_picture_url",
    "provider": "google"
  }
}
```

### Short Link Management (requires authentication)

```
POST /links
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "target": "https://example.com",
  "code": "custom-code"
}
```

## Data Model

### Users Table (`chainy-users`)

```json
{
  "user_id": "google_user_id",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "profile_picture_url",
  "provider": "google",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "last_login_at": "2024-01-01T00:00:00Z"
}
```

## Security Considerations

1. Verify Google ID tokens with Google's public endpoints
2. Store the Chainy JWT signing secret in AWS SSM Parameter Store
3. Serve all requests over HTTPS
4. Configure CORS to match the domains you allow
5. Restrict user operations to their own short links

## Testing

### Automated Check

```bash
export API_ENDPOINT="https://your-api-gateway-url"
./test-google-auth.sh
```

### End-to-end verification (requires Google test account)

```bash
export CHAINY_API_ENDPOINT="https://your-api-gateway-url"
export GOOGLE_CLIENT_ID="your_google_client_id"
export GOOGLE_CLIENT_SECRET="your_google_client_secret"
export GOOGLE_TEST_REFRESH_TOKEN="oauth_refresh_token_for_test_user"
export GOOGLE_TEST_REDIRECT_URI="http://localhost:3000/google-auth-callback.html" # optional override

npm run test:e2e
```

> ⚠️ Keep `GOOGLE_TEST_REFRESH_TOKEN` secure. Generate it once through the OAuth consent flow (choose "Allow" when prompted) and store it using a secret manager for CI environments.

### Manual Validation

1. Start the frontend development server
2. Click the Google sign-in button
3. Complete the Google login flow
4. Confirm that you can create custom short links
5. Verify that user records are written correctly

## Troubleshooting

### Common Issues

1. **Button does not render**
   - Confirm `VITE_GOOGLE_CLIENT_ID` is configured
   - Review the Google Cloud Console client settings

2. **Authentication fails**
   - Check CloudWatch logs at `/aws/lambda/chainy-prod-google-auth`
   - Ensure the Google client ID matches between frontend and backend

3. **CORS errors**
   - Verify API Gateway CORS settings
   - Make sure your frontend origin is listed in the Google OAuth client

4. **User creation fails**
   - Check IAM permissions for the DynamoDB table
   - Confirm the Lambda execution role can access SSM and DynamoDB

### Helpful Commands

```bash
aws logs tail /aws/lambda/chainy-prod-google-auth --follow
aws dynamodb scan --table-name chainy-prod-chainy-users
aws ssm get-parameter --name /chainy/prod/jwt-secret --with-decryption
```

## Monitoring

### CloudWatch Metrics

- Lambda invocation count
- Lambda error rate
- Execution duration

### Logs

- Google authentication request logs
- User creation and update logs
- Error logs

## Maintenance

### Updating the Google Client ID

```bash
terraform apply -var="google_client_id=new_client_id"
```

### Updating the Frontend

```bash
echo "VITE_GOOGLE_CLIENT_ID=new_client_id" > .env.local
```

## References

- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [DynamoDB](https://docs.aws.amazon.com/dynamodb/)
- [JWT](https://jwt.io/)

## Contributions

Contributions are welcome. Please open an issue or submit a pull request to improve the Google OAuth 2.0 integration.

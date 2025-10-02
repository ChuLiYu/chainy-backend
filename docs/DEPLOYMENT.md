# Deployment Pipeline with GitHub Actions OIDC and AWS

This document summarises how we automated deployments for the `chainy-web` front-end using GitHub Actions together with AWS IAM role assumption via OpenID Connect (OIDC).

## Goals
- Build the Vite front-end and publish the static assets to Amazon S3.
- Invalidate the CloudFront distribution so new content becomes available instantly.
- Remove long-lived AWS access keys by switching to OIDC federation.

## AWS IAM Setup
1. **Create an OIDC provider** (only once per AWS account):
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```

2. **Create the IAM role** (`github-actions-chainy`):
   ```bash
   aws iam create-role \
     --role-name github-actions-chainy \
     --assume-role-policy-document file://aws-trust-policy-main.json
   ```

3. **Trust policy (`aws-trust-policy-main.json`):**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::277375108569:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": [
               "repo:ChuLiYu/chainy-web:ref:refs/heads/*",
               "repo:ChuLiYu/chainy-web:environment:production"
             ]
           }
         }
       }
     ]
   }
   ```
   > The `environment: production` subject was required because the GitHub Actions job uses `environment: production`, which changes the OIDC token subject format.

4. **Attach the inline policy (`deploy-policy.json`)** providing S3 sync and CloudFront invalidation rights:
   ```bash
   aws iam put-role-policy \
     --role-name github-actions-chainy \
     --policy-name chainy-deploy-policy \
     --policy-document file://deploy-policy.json
   ```
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "S3SyncBucket",
         "Effect": "Allow",
         "Action": ["s3:ListBucket"],
         "Resource": "arn:aws:s3:::chainy-dev-web"
       },
       {
         "Sid": "S3SyncObjects",
         "Effect": "Allow",
         "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::chainy-dev-web/*"
       },
       {
         "Sid": "CloudFrontGet",
         "Effect": "Allow",
         "Action": ["cloudfront:GetDistribution", "cloudfront:GetInvalidation"],
         "Resource": "arn:aws:cloudfront::277375108569:distribution/E3NPZS3FX3FUIT"
       },
       {
         "Sid": "CloudFrontInvalidate",
         "Effect": "Allow",
         "Action": ["cloudfront:CreateInvalidation"],
         "Resource": "*"
       }
     ]
   }
   ```

## GitHub Actions Workflow (`.github/workflows/ci.yml` excerpt)
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    environment: production
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: |
          echo "VITE_CHAINY_API=${{ secrets.CHAINY_API_ENDPOINT }}" > .env.production
          npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::277375108569:role/github-actions-chainy
          aws-region: ap-northeast-1

      - name: Upload to S3
        run: |
          aws s3 sync dist/ s3://${{ secrets.CHAINY_FRONTEND_BUCKET }} --delete

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CHAINY_CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

## GitHub Secrets
- `CHAINY_API_ENDPOINT` → `https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com`
- `CHAINY_FRONTEND_BUCKET` → `chainy-dev-web`
- `CHAINY_CLOUDFRONT_DISTRIBUTION_ID` → `E3NPZS3FX3FUIT`

## Key Lessons
- When using GitHub Actions environments, the OIDC subject becomes `repo:OWNER/REPO:environment:NAME`; the trust policy must include this pattern.
- Changing repos (chainy-backend → chainy-web) requires updating both trust policies and repository secrets.
- S3 sync and CloudFront invalidation permissions can sit in a single inline policy.
- Troubleshooting “Credentials could not be loaded” often comes down to mismatched OIDC subjects or missing policy attachments.

With this setup, each push to `main` (or manual “Run workflow”) builds the front-end, synchronises the assets to S3, and invalidates CloudFront without the need for long-lived AWS keys.

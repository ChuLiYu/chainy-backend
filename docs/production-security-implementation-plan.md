# Production Security Hardening - Implementation Plan

**Branch**: `feature/production-security-hardening`  
**Start Date**: October 1, 2025  
**Estimated Duration**: 10-13 days  
**Status**: 📋 Planning Phase

---

## 🎯 Implementation Overview

This plan details the step-by-step implementation of critical security measures identified in the security audit report. The implementation is divided into 3 phases based on priority.

---

## 📅 Phase 1: Critical Security Measures (Days 1-4)

### Priority: 🔴 CRITICAL - Must complete before production launch

---

### 1.1 API Authentication (Lambda Authorizer + JWT)

**Estimated Time**: 2-3 days  
**Complexity**: Medium-High  
**Risk**: Low (well-established pattern)

#### Implementation Steps

**Step 1: Create JWT Utilities Library** (2 hours)

```typescript
// lib/jwt.ts
import { createHmac } from "crypto";

interface JWTPayload {
  sub: string; // User ID
  email?: string; // User email
  role?: string; // User role (admin, user, etc.)
  iat: number; // Issued at
  exp: number; // Expiration
}

export function generateJWT(payload: JWTPayload, secret: string): string {
  // JWT generation logic
}

export function verifyJWT(token: string, secret: string): JWTPayload {
  // JWT verification logic
}
```

**Step 2: Create Lambda Authorizer** (4 hours)

```typescript
// handlers/authorizer.ts
import {
  APIGatewayAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from "aws-lambda";
import { verifyJWT } from "../lib/jwt.js";
import { getParameterFromSSM } from "../lib/ssm.js";

export async function handler(
  event: APIGatewayAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  const token = event.headers?.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new Error("Unauthorized");
  }

  try {
    // Get JWT secret from SSM
    const jwtSecret = await getParameterFromSSM("/chainy/dev/jwt-secret");

    // Verify token
    const payload = verifyJWT(token, jwtSecret);

    // Generate IAM policy
    return generatePolicy(payload.sub, "Allow", event.methodArn, {
      userId: payload.sub,
      email: payload.email || "",
      role: payload.role || "user",
    });
  } catch (error) {
    console.error("Authorization failed:", error);
    throw new Error("Unauthorized");
  }
}

function generatePolicy(
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string,
  context: Record<string, string>
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
}
```

**Step 3: Update Terraform Configuration** (3 hours)

```hcl
# modules/lambda/main.tf - Add authorizer Lambda

resource "aws_lambda_function" "authorizer" {
  function_name    = "${var.project}-${var.environment}-authorizer"
  filename         = "${path.module}/build/authorizer.zip"
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.authorizer.output_base64sha256
  role             = aws_iam_role.lambda["authorizer"].arn
  timeout          = 10
  memory_size      = 256

  environment {
    variables = merge(var.additional_environment, {
      JWT_SECRET_PARAM = var.jwt_secret_parameter_name
    })
  }

  tags = var.tags
}

data "archive_file" "authorizer" {
  type        = "zip"
  source_dir  = var.authorizer_source_dir
  output_path = "${path.module}/build/authorizer.zip"
}
```

```hcl
# modules/api/main.tf - Add authorizer to API Gateway

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.chainy.id
  authorizer_type  = "REQUEST"
  authorizer_uri   = var.authorizer_lambda_invoke_arn
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project}-${var.environment}-jwt-authorizer"

  authorizer_payload_format_version = "2.0"
  enable_simple_responses            = true
  authorizer_result_ttl_in_seconds   = 300  # Cache for 5 minutes
}

# Update CRUD routes to use authorizer
resource "aws_apigatewayv2_route" "create" {
  for_each = toset([
    "POST /links",
    "GET /links/{code}",
    "PUT /links/{code}",
    "DELETE /links/{code}"
  ])

  api_id             = aws_apigatewayv2_api.chainy.id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.links.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}
```

**Step 4: Add SSM Parameter for JWT Secret** (1 hour)

```bash
# Generate secure JWT secret
JWT_SECRET=$(openssl rand -base64 64)

# Store in SSM
aws ssm put-parameter \
  --name "/chainy/dev/jwt-secret" \
  --value "$JWT_SECRET" \
  --type "SecureString" \
  --overwrite \
  --region ap-northeast-1
```

**Step 5: Update Build Script** (1 hour)

```javascript
// scripts/build-lambdas.mjs - Add authorizer build
const functions = [
  { name: "redirect", handler: "handlers/redirect.ts" },
  { name: "create", handler: "handlers/create.ts" },
  { name: "authorizer", handler: "handlers/authorizer.ts" }, // New
];
```

**Step 6: Frontend Integration** (4 hours)

```typescript
// chainy-web/src/services/auth.ts
export class AuthService {
  private token: string | null = null;

  async login(email: string, password: string): Promise<void> {
    // Call authentication endpoint (to be implemented)
    const response = await fetch(`${API_ENDPOINT}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const { token } = await response.json();
    this.token = token;
    localStorage.setItem("chainy_token", token);
  }

  getToken(): string | null {
    return this.token || localStorage.getItem("chainy_token");
  }

  async createLink(target: string) {
    const token = this.getToken();
    if (!token) throw new Error("Not authenticated");

    return fetch(`${API_ENDPOINT}/links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ target }),
    });
  }
}
```

**Step 7: Testing** (4 hours)

- Unit tests for JWT utilities
- Integration tests for authorizer
- End-to-end tests with frontend
- Load testing

#### Success Criteria

- [ ] All CRUD endpoints protected
- [ ] Valid JWT tokens grant access
- [ ] Invalid/expired tokens denied
- [ ] Frontend can authenticate and create links
- [ ] No breaking changes to redirect functionality

#### Rollback Plan

If issues occur:

1. Revert to main branch
2. Remove authorizer configuration
3. Keep Lambda functions (no harm if unused)

---

### 1.2 WAF Deployment

**Estimated Time**: 1 day  
**Complexity**: Medium  
**Risk**: Very Low (AWS managed rules)

#### Implementation Steps

**Step 1: Create WAF Module** (2 hours)

```hcl
# modules/waf/main.tf
resource "aws_wafv2_web_acl" "chainy" {
  provider = aws.us_east_1  # WAF for CloudFront must be in us-east-1
  name     = "${var.project}-${var.environment}-waf"
  scope    = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rate Limiting
  rule {
    name     = "RateLimitRule"
    priority = 2

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitMetric"
      sampled_requests_enabled   = true
    }
  }

  # Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputsMetric"
      sampled_requests_enabled   = true
    }
  }

  # Bot Control (Optional - additional cost)
  # rule {
  #   name     = "AWSManagedRulesBotControlRuleSet"
  #   priority = 4
  #   ...
  # }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ChainyWAF"
    sampled_requests_enabled   = true
  }

  tags = var.tags
}
```

**Step 2: Associate WAF with CloudFront** (1 hour)

```hcl
# modules/web/main.tf
resource "aws_cloudfront_distribution" "web" {
  # ... existing config ...

  web_acl_id = var.waf_web_acl_id  # Add this line

  # ... rest of config ...
}
```

**Step 3: Deploy and Monitor** (3 hours)

```bash
terraform apply

# Monitor WAF metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=chainy-dev-waf \
  --start-time 2025-10-01T00:00:00Z \
  --end-time 2025-10-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

**Step 4: Fine-tuning** (2 hours)

- Review blocked requests
- Adjust rate limits if needed
- Add custom rules for specific threats

#### Success Criteria

- [ ] WAF deployed successfully
- [ ] Malicious traffic blocked
- [ ] Legitimate traffic passes through
- [ ] Metrics visible in CloudWatch
- [ ] No false positives

#### Cost Impact

- WAF: ~$5-10/month (based on request volume)
- CloudWatch metrics: ~$1/month

---

## 📅 Phase 2: High Priority Measures (Days 5-9)

### Priority: 🟡 HIGH - Recommended before production

---

### 2.1 DynamoDB Encryption at Rest

**Estimated Time**: 2 hours  
**Complexity**: Low  
**Risk**: Medium (requires table recreation if not using KMS)

#### Implementation Steps

**Option A: AWS Managed Key (Recommended for simplicity)**

```hcl
# modules/db/main.tf
resource "aws_dynamodb_table" "links" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "code"

  # Add encryption
  server_side_encryption {
    enabled = true
    # KMS key not specified = AWS managed key (free)
  }

  # Add backup
  point_in_time_recovery {
    enabled = true
  }

  # ... rest of config ...
}
```

**Option B: Customer Managed KMS Key (Better audit trail)**

```hcl
# modules/kms/main.tf
resource "aws_kms_key" "dynamodb" {
  description             = "KMS key for DynamoDB encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = var.tags
}

resource "aws_kms_alias" "dynamodb" {
  name          = "alias/${var.project}-${var.environment}-dynamodb"
  target_key_id = aws_kms_key.dynamodb.key_id
}

# modules/db/main.tf
resource "aws_dynamodb_table" "links" {
  # ...

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  # ...
}
```

⚠️ **Important**: Enabling encryption requires table recreation. Plan maintenance window.

---

### 2.2 S3 Encryption at Rest

**Estimated Time**: 1 hour  
**Complexity**: Low  
**Risk**: Very Low

```hcl
# modules/events/main.tf
resource "aws_s3_bucket_server_side_encryption_configuration" "events" {
  bucket = aws_s3_bucket.events.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

# modules/web/main.tf
resource "aws_s3_bucket_server_side_encryption_configuration" "web" {
  bucket = aws_s3_bucket.web.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"  # Or aws:kms
    }
  }
}
```

---

### 2.3 CORS Restrictions

**Estimated Time**: 0.5 day  
**Complexity**: Very Low  
**Risk**: Low

```hcl
# modules/api/main.tf
resource "aws_apigatewayv2_api" "chainy" {
  name          = local.api_name
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = [
      "https://chainy.luichu.dev",
      "http://localhost:5173",  # For local development
      # Add other allowed origins as needed
    ]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = [
      "content-type",
      "authorization",
      "x-amz-date",
      "x-amz-security-token"
    ]
    expose_headers = ["x-request-id"]
    max_age        = 3600
  }

  tags = merge(var.tags, {
    "Name" = local.api_name
  })
}
```

---

### 2.4 CloudWatch Alarms & Monitoring

**Estimated Time**: 1-2 days  
**Complexity**: Medium  
**Risk**: Very Low

```hcl
# modules/monitoring/main.tf

# SNS Topic for alarms
resource "aws_sns_topic" "alarms" {
  name = "${var.project}-${var.environment}-alarms"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Lambda Error Alarm
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = var.lambda_functions

  alarm_name          = "${var.project}-${var.environment}-${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Lambda function ${each.key} error rate is high"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    FunctionName = each.value
  }
}

# API Gateway 4XX Errors
resource "aws_cloudwatch_metric_alarm" "api_4xx" {
  alarm_name          = "${var.project}-${var.environment}-api-4xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "High rate of client errors"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    ApiId = var.api_id
  }
}

# DynamoDB Throttles
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttles" {
  alarm_name          = "${var.project}-${var.environment}-dynamodb-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UserErrors"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "DynamoDB throttling detected"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    TableName = var.table_name
  }
}
```

---

### 2.5 Input Validation Enhancement

**Estimated Time**: 1 day  
**Complexity**: Medium  
**Risk**: Low

```typescript
// lib/validation.ts
import validator from "validator";

export function validateURL(url: string): { valid: boolean; error?: string } {
  // Basic validation
  if (
    !validator.isURL(url, {
      protocols: ["http", "https"],
      require_protocol: true,
      require_valid_protocol: true,
      allow_underscores: false,
      disallow_auth: true,
    })
  ) {
    return { valid: false, error: "Invalid URL format" };
  }

  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname;

  // SSRF Prevention: Block private IP ranges
  const privateIPPatterns = [
    /^127\./, // Localhost
    /^10\./, // Private network
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private network
    /^192\.168\./, // Private network
    /^169\.254\./, // Link-local
    /^::1$/, // IPv6 localhost
    /^fc00:/, // IPv6 private
    /^fe80:/, // IPv6 link-local
  ];

  if (
    hostname === "localhost" ||
    privateIPPatterns.some((p) => p.test(hostname))
  ) {
    return { valid: false, error: "Private IP addresses are not allowed" };
  }

  // Check for suspicious patterns
  if (url.includes("javascript:") || url.includes("data:")) {
    return { valid: false, error: "Suspicious URL scheme detected" };
  }

  return { valid: true };
}

export function sanitizeShortCode(code: string): string {
  // Allow only alphanumeric, dash, underscore
  return code.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function validateShortCode(code: string): {
  valid: boolean;
  error?: string;
} {
  if (code.length < 3 || code.length > 20) {
    return { valid: false, error: "Code must be between 3-20 characters" };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
    return {
      valid: false,
      error: "Code can only contain alphanumeric, dash, underscore",
    };
  }

  // Reserved words
  const reserved = ["admin", "api", "links", "auth", "login", "logout"];
  if (reserved.includes(code.toLowerCase())) {
    return { valid: false, error: "Code is reserved" };
  }

  return { valid: true };
}
```

---

## 📅 Phase 3: Medium Priority (Days 10-13)

### Priority: 🟢 MEDIUM - Nice to have

---

### 3.1 GDPR Compliance Features

**Estimated Time**: 2-3 days

- Data deletion API
- Data export API
- Privacy policy page
- Cookie consent (if using cookies)

---

### 3.2 Security Automation

**Estimated Time**: 1 day

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: "0 0 * * 0"

jobs:
  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm audit --production --audit-level=high

  terraform-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: aquasecurity/tfsec-action@v1.0.0

  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## 📊 Implementation Schedule

| Phase       | Days  | Items                                       | Status     |
| ----------- | ----- | ------------------------------------------- | ---------- |
| **Phase 1** | 1-4   | API Auth + WAF                              | 📋 Planned |
| **Phase 2** | 5-9   | Encryption + CORS + Monitoring + Validation | 📋 Planned |
| **Phase 3** | 10-13 | GDPR + Automation                           | 📋 Planned |

---

## ✅ Pre-Implementation Checklist

Before starting, ensure:

- [ ] Current `main` branch is stable and pushed
- [ ] New branch `feature/production-security-hardening` created
- [ ] All team members notified of upcoming changes
- [ ] Backup of current production data (if applicable)
- [ ] Test environment available for validation
- [ ] AWS credentials configured with necessary permissions
- [ ] Budget approved for additional AWS services (WAF, KMS)

---

## 🚀 Getting Started

**Ready to proceed?**

1. Review this plan and provide feedback
2. Approve budget for additional services (~$15-20/month)
3. Schedule implementation time blocks
4. Begin Phase 1 implementation

**Estimated costs:**

- WAF: $5-10/month
- KMS: $1/month per key
- CloudWatch: $1-2/month
- SNS: < $1/month
- **Total: ~$15-20/month additional**

---

## 📞 Support & Questions

If you have questions about any part of this plan:

1. Security concerns → Refer to `security-audit-report.md`
2. Implementation details → This document
3. Architecture questions → Refer to `architecture.md`

---

**Document Version**: 1.0  
**Last Updated**: October 1, 2025  
**Next Review**: After Phase 1 completion

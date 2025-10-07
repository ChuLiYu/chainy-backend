# 生產環境安全加固 - 實施計劃

**分支**: `feature/production-security-hardening`  
**開始日期**: 2025 年 10 月 1 日  
**預估時間**: 10-13 天  
**狀態**: 📋 計劃階段

---

## 🎯 實施概覽

本計劃詳細說明資安審查報告中識別的關鍵安全措施的逐步實施方案。實施工作根據優先級分為 3 個階段。

---

## 📅 階段 1：嚴重安全措施（第 1-4 天）

### 優先級：🔴 嚴重 - 生產環境上線前必須完成

---

### 1.1 API 身份驗證（Lambda Authorizer + JWT）

**預估時間**：2-3 天  
**複雜度**：中高  
**風險**：低（成熟的模式）

#### 實施步驟

**步驟 1：創建 JWT 工具庫**（2 小時）

```typescript
// lib/jwt.ts
import { createHmac } from "crypto";

interface JWTPayload {
  sub: string; // 用戶 ID
  email?: string; // 用戶 email
  role?: string; // 用戶角色（admin、user 等）
  iat: number; // 簽發時間
  exp: number; // 過期時間
}

export function generateJWT(payload: JWTPayload, secret: string): string {
  // JWT 生成邏輯
}

export function verifyJWT(token: string, secret: string): JWTPayload {
  // JWT 驗證邏輯
}
```

**步驟 2：創建 Lambda Authorizer**（4 小時）

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
    // 從 SSM 獲取 JWT 密鑰
    const jwtSecret = await getParameterFromSSM("/chainy/dev/jwt-secret");

    // 驗證 token
    const payload = verifyJWT(token, jwtSecret);

    // 生成 IAM 策略
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
```

**步驟 3：更新 Terraform 配置**（3 小時）

```hcl
# modules/lambda/main.tf - 添加 authorizer Lambda

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
```

```hcl
# modules/api/main.tf - 為 API Gateway 添加 authorizer

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.chainy.id
  authorizer_type  = "REQUEST"
  authorizer_uri   = var.authorizer_lambda_invoke_arn
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project}-${var.environment}-jwt-authorizer"

  authorizer_payload_format_version = "2.0"
  enable_simple_responses            = true
  authorizer_result_ttl_in_seconds   = 300  # 緩存 5 分鐘
}

# 更新 CRUD 路由以使用 authorizer
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

**步驟 4：為 JWT 密鑰添加 SSM 參數**（1 小時）

```bash
# 生成安全的 JWT 密鑰
JWT_SECRET=$(openssl rand -base64 64)

# 存儲到 SSM
aws ssm put-parameter \
  --name "/chainy/dev/jwt-secret" \
  --value "$JWT_SECRET" \
  --type "SecureString" \
  --overwrite \
  --region ap-northeast-1
```

**步驟 5：更新建構腳本**（1 小時）

```javascript
// scripts/build-lambdas.mjs - 添加 authorizer 建構
const functions = [
  { name: "redirect", handler: "handlers/redirect.ts" },
  { name: "create", handler: "handlers/create.ts" },
  { name: "authorizer", handler: "handlers/authorizer.ts" }, // 新增
];
```

**步驟 6：前端整合**（4 小時）

```typescript
// chainy-web/src/services/auth.ts
export class AuthService {
  private token: string | null = null;

  async login(email: string, password: string): Promise<void> {
    // 調用身份驗證端點（待實施）
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

**步驟 7：測試**（4 小時）

- JWT 工具的單元測試
- Authorizer 的整合測試
- 與前端的端到端測試
- 負載測試

#### 成功標準

- [ ] 所有 CRUD 端點受保護
- [ ] 有效的 JWT token 授予存取權限
- [ ] 無效/過期的 token 被拒絕
- [ ] 前端可以驗證並建立連結
- [ ] 重定向功能無破壞性變更

#### 回滾計劃

如果出現問題：

1. 回滾到 main 分支
2. 移除 authorizer 配置
3. 保留 Lambda 函數（不使用無害）

---

### 1.2 WAF 部署

**預估時間**：1 天  
**複雜度**：中  
**風險**：極低（AWS 託管規則）

#### 實施步驟

**步驟 1：創建 WAF 模組**（2 小時）

```hcl
# modules/waf/main.tf
resource "aws_wafv2_web_acl" "chainy" {
  provider = aws.us_east_1  # CloudFront 的 WAF 必須在 us-east-1
  name     = "${var.project}-${var.environment}-waf"
  scope    = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # 核心規則集
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

  # 速率限制
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

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ChainyWAF"
    sampled_requests_enabled   = true
  }

  tags = var.tags
}
```

**步驟 2：將 WAF 與 CloudFront 關聯**（1 小時）

```hcl
# modules/web/main.tf
resource "aws_cloudfront_distribution" "web" {
  # ... 現有配置 ...

  web_acl_id = var.waf_web_acl_id  # 添加此行

  # ... 其餘配置 ...
}
```

**步驟 3：部署和監控**（3 小時）

```bash
terraform apply

# 監控 WAF 指標
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=chainy-dev-waf \
  --start-time 2025-10-01T00:00:00Z \
  --end-time 2025-10-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

#### 成功標準

- [ ] WAF 成功部署
- [ ] 惡意流量被阻擋
- [ ] 合法流量通過
- [ ] CloudWatch 中可見指標
- [ ] 無誤報

#### 成本影響

- WAF：約 $5-10/月（基於請求量）
- CloudWatch 指標：約 $1/月

---

## 📅 階段 2：高優先級措施（第 5-9 天）

### 優先級：🟡 高 - 生產環境前推薦

---

### 2.1 DynamoDB 靜態加密

**預估時間**：2 小時  
**複雜度**：低  
**風險**：中（如不使用 KMS 需要重建表）

#### 實施步驟

**選項 A：AWS 託管密鑰（推薦簡單）**

```hcl
# modules/db/main.tf
resource "aws_dynamodb_table" "links" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "code"

  # 添加加密
  server_side_encryption {
    enabled = true
    # 不指定 KMS 密鑰 = AWS 託管密鑰（免費）
  }

  # 添加備份
  point_in_time_recovery {
    enabled = true
  }

  # ... 其餘配置 ...
}
```

⚠️ **重要**：啟用加密需要重建表。請規劃維護時間窗口。

---

### 2.2 S3 靜態加密

**預估時間**：1 小時  
**複雜度**：低  
**風險**：極低

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
```

---

### 2.3 CORS 限制

**預估時間**：0.5 天  
**複雜度**：極低  
**風險**：低

```hcl
# modules/api/main.tf
resource "aws_apigatewayv2_api" "chainy" {
  name          = local.api_name
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = [
      "https://chainy.luichu.dev",
      "http://localhost:3000",  # 本地開發
      # 根據需要添加其他允許的來源
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

### 2.4 CloudWatch 警報與監控

**預估時間**：1-2 天  
**複雜度**：中  
**風險**：極低

```hcl
# modules/monitoring/main.tf

# 警報的 SNS 主題
resource "aws_sns_topic" "alarms" {
  name = "${var.project}-${var.environment}-alarms"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Lambda 錯誤警報
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
  alarm_description   = "Lambda 函數 ${each.key} 錯誤率過高"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    FunctionName = each.value
  }
}
```

---

### 2.5 輸入驗證增強

**預估時間**：1 天  
**複雜度**：中  
**風險**：低

```typescript
// lib/validation.ts
import validator from "validator";

export function validateURL(url: string): { valid: boolean; error?: string } {
  // 基本驗證
  if (
    !validator.isURL(url, {
      protocols: ["http", "https"],
      require_protocol: true,
      require_valid_protocol: true,
      allow_underscores: false,
      disallow_auth: true,
    })
  ) {
    return { valid: false, error: "無效的 URL 格式" };
  }

  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname;

  // SSRF 防護：阻擋私有 IP 範圍
  const privateIPPatterns = [
    /^127\./, // Localhost
    /^10\./, // 私有網路
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 私有網路
    /^192\.168\./, // 私有網路
    /^169\.254\./, // Link-local
    /^::1$/, // IPv6 localhost
    /^fc00:/, // IPv6 私有
    /^fe80:/, // IPv6 link-local
  ];

  if (
    hostname === "localhost" ||
    privateIPPatterns.some((p) => p.test(hostname))
  ) {
    return { valid: false, error: "不允許使用私有 IP 地址" };
  }

  // 檢查可疑模式
  if (url.includes("javascript:") || url.includes("data:")) {
    return { valid: false, error: "檢測到可疑的 URL scheme" };
  }

  return { valid: true };
}

export function sanitizeShortCode(code: string): string {
  // 僅允許字母數字、破折號、底線
  return code.replace(/[^a-zA-Z0-9_-]/g, "");
}
```

---

## 📅 階段 3：中優先級（第 10-13 天）

### 優先級：🟢 中 - 建議擁有

---

### 3.1 GDPR 合規功能

**預估時間**：2-3 天

- 資料刪除 API
- 資料匯出 API
- 隱私政策頁面
- Cookie 同意（如使用 cookie）

---

### 3.2 安全自動化

**預估時間**：1 天

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
```

---

## 📊 實施時程表

| 階段       | 天數  | 項目                      | 狀態      |
| ---------- | ----- | ------------------------- | --------- |
| **階段 1** | 1-4   | API 驗證 + WAF            | 📋 已計劃 |
| **階段 2** | 5-9   | 加密 + CORS + 監控 + 驗證 | 📋 已計劃 |
| **階段 3** | 10-13 | GDPR + 自動化             | 📋 已計劃 |

---

## ✅ 實施前檢查清單

開始前確保：

- [ ] 目前的 `main` 分支穩定且已推送
- [ ] 新分支 `feature/production-security-hardening` 已創建
- [ ] 所有團隊成員已通知即將進行的變更
- [ ] 目前生產資料已備份（如適用）
- [ ] 測試環境可用於驗證
- [ ] AWS 憑證配置有必要的權限
- [ ] 額外 AWS 服務的預算已批准（WAF、KMS）

---

## 🚀 開始實施

**準備好繼續了嗎？**

1. 審查此計劃並提供反饋
2. 批准額外服務的預算（約 $15-20/月）
3. 安排實施時間
4. 開始階段 1 實施

**預估成本：**

- WAF：$5-10/月
- KMS：每個密鑰 $1/月
- CloudWatch：$1-2/月
- SNS：< $1/月
- **總計：約 $15-20/月額外成本**

---

## 📞 支援與問題

如果您對此計劃的任何部分有疑問：

1. 安全問題 → 參考 `security-audit-report.md`
2. 實施細節 → 本文檔
3. 架構問題 → 參考 `architecture.md`

---

**文檔版本**：1.0  
**最後更新**：2025 年 10 月 1 日  
**下次審查**：階段 1 完成後

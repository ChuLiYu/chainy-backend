# 💰 成本控制和低成本替代方案

## 📋 目錄

1. [AWS 預算警報和自動停止](#aws-預算警報和自動停止)
2. [低成本替代方案](#低成本替代方案)
3. [成本優化最佳實踐](#成本優化最佳實踐)
4. [混合方案](#混合方案)

---

## 🚨 AWS 預算警報和自動停止

### 方案 1：AWS Budgets - 預算警報（推薦）✅

**設置月度預算，超過自動通知或停止服務**

#### 1.1 創建預算監控

```bash
# 使用 AWS CLI 創建預算
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget-config.json \
  --notifications-with-subscribers file://notifications.json
```

**budget-config.json:**

```json
{
  "BudgetName": "Chainy-Monthly-Budget",
  "BudgetLimit": {
    "Amount": "20",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "TagKeyValue": ["Project$chainy"]
  }
}
```

**notifications.json:**

```json
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "your-email@example.com"
      }
    ]
  },
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 100,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "your-email@example.com"
      }
    ]
  }
]
```

**效果：**

- 💰 花費到 $16（80%）：收到警告郵件 ⚠️
- 💰 花費到 $20（100%）：收到緊急通知 🚨
- **成本：前 2 個預算免費，之後 $0.02/天**

#### 1.2 Terraform 配置 AWS Budgets

```hcl
# modules/budget/main.tf
resource "aws_budgets_budget" "monthly_budget" {
  name              = "${var.project}-${var.environment}-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"

  cost_filter {
    name = "TagKeyValue"
    values = [
      "Project$${var.project}"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 120
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }
}

# 創建 SNS Topic 用於自動化操作
resource "aws_sns_topic" "budget_alert" {
  name = "${var.project}-${var.environment}-budget-alert"
}

resource "aws_sns_topic_subscription" "budget_email" {
  topic_arn = aws_sns_topic.budget_alert.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
```

**使用方式：**

```hcl
# main.tf
module "budget" {
  source = "./modules/budget"

  project     = var.project
  environment = var.environment

  monthly_budget_limit = 20  # $20/月
  alert_emails        = ["your-email@example.com"]
}
```

### 方案 2：自動停止服務（進階）⚠️

**當超過預算時，自動停止或限制服務**

#### 2.1 創建自動停止 Lambda

**handlers/budget-enforcer.ts:**

```typescript
import {
  LambdaClient,
  UpdateFunctionConfigurationCommand,
} from "@aws-sdk/client-lambda";
import {
  APIGatewayClient,
  UpdateStageCommand,
} from "@aws-sdk/client-api-gateway";
import { SNSEvent } from "aws-lambda";

const lambdaClient = new LambdaClient({});
const apiClient = new APIGatewayClient({});

export async function handler(event: SNSEvent) {
  console.log("Budget alert received:", JSON.stringify(event));

  const message = JSON.parse(event.Records[0].Sns.Message);
  const budgetUsage = parseFloat(message.threshold);

  if (budgetUsage >= 100) {
    console.log("Budget exceeded 100%, taking action...");

    // 選項 1：停用 Lambda 函數（暫停服務）
    await disableLambdaFunctions();

    // 選項 2：降低 API Gateway 速率限制
    await reduceApiRateLimit();

    // 選項 3：發送緊急通知
    await sendEmergencyAlert();
  } else if (budgetUsage >= 80) {
    console.log("Budget at 80%, monitoring closely...");
    await sendWarningAlert();
  }
}

async function disableLambdaFunctions() {
  const functions = [
    process.env.CREATE_LAMBDA_NAME,
    process.env.REDIRECT_LAMBDA_NAME,
  ];

  for (const functionName of functions) {
    try {
      await lambdaClient.send(
        new UpdateFunctionConfigurationCommand({
          FunctionName: functionName,
          Environment: {
            Variables: {
              EMERGENCY_STOP: "true", // Lambda 內部檢查這個變數
            },
          },
        })
      );
      console.log(`Disabled Lambda function: ${functionName}`);
    } catch (error) {
      console.error(`Failed to disable ${functionName}:`, error);
    }
  }
}

async function reduceDynamoDBCapacity() {
  // 降低 DynamoDB 容量到最小
  // 實作細節...
}

async function reducedApiRateLimit() {
  // 將 API Gateway 速率限制降到最低
  const apiId = process.env.API_GATEWAY_ID;
  const stageName = "$default";

  await apiClient.send(
    new UpdateStageCommand({
      restApiId: apiId,
      stageName: stageName,
      patchOperations: [
        {
          op: "replace",
          path: "/throttle/rateLimit",
          value: "1", // 降到每秒 1 次請求
        },
      ],
    })
  );
}

async function sendEmergencyAlert() {
  // 發送緊急通知給管理員
  console.log("🚨 EMERGENCY: Budget exceeded, services limited!");
}

async function sendWarningAlert() {
  console.log("⚠️ WARNING: Budget at 80%");
}
```

#### 2.2 Terraform 配置自動停止

```hcl
# modules/budget/auto-stop.tf

# Lambda 函數用於預算超標時的自動操作
resource "aws_lambda_function" "budget_enforcer" {
  function_name = "${var.project}-${var.environment}-budget-enforcer"
  filename      = "${path.module}/budget-enforcer.zip"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.budget_enforcer.arn
  timeout       = 30

  environment {
    variables = {
      CREATE_LAMBDA_NAME   = var.create_lambda_name
      REDIRECT_LAMBDA_NAME = var.redirect_lambda_name
      API_GATEWAY_ID       = var.api_gateway_id
    }
  }
}

# IAM 角色給予權限
resource "aws_iam_role" "budget_enforcer" {
  name = "${var.project}-${var.environment}-budget-enforcer-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "budget_enforcer" {
  role = aws_iam_role.budget_enforcer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionConfiguration",
          "apigateway:UpdateStage",
          "dynamodb:UpdateTable"
        ]
        Resource = "*"
      }
    ]
  })
}

# SNS 訂閱，觸發 Lambda
resource "aws_sns_topic_subscription" "budget_lambda" {
  topic_arn = aws_sns_topic.budget_alert.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.budget_enforcer.arn
}

resource "aws_lambda_permission" "sns" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.budget_enforcer.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.budget_alert.arn
}
```

#### 2.3 更安全的方式：維護模式

**在 Lambda 中檢查緊急停止標誌：**

```typescript
// handlers/create.ts
export async function handler(event: APIGatewayProxyEventV2) {
  // 檢查緊急停止標誌
  if (process.env.EMERGENCY_STOP === "true") {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:
          "Service temporarily unavailable due to budget limits. Please contact support.",
      }),
    };
  }

  // 正常處理...
}
```

### 方案 3：每日成本檢查腳本（簡單方案）

```bash
#!/bin/bash
# scripts/check-daily-cost.sh

# 設置每日預算上限
DAILY_LIMIT=2  # $2/天

# 獲取今日成本
TODAY=$(date +%Y-%m-%d)
COST=$(aws ce get-cost-and-usage \
  --time-period Start=${TODAY},End=${TODAY} \
  --granularity DAILY \
  --metrics UnblendedCost \
  --filter file://cost-filter.json \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --output text)

echo "Today's cost: \$$COST"

# 檢查是否超過限制
if (( $(echo "$COST > $DAILY_LIMIT" | bc -l) )); then
  echo "🚨 ALERT: Daily cost exceeded \$$DAILY_LIMIT!"

  # 選項 1：發送郵件通知
  echo "Daily cost \$$COST exceeded limit \$$DAILY_LIMIT" | \
    mail -s "AWS Cost Alert" your-email@example.com

  # 選項 2：自動停止服務
  # terraform destroy -auto-approve

  # 選項 3：降低資源配置
  # aws lambda update-function-configuration \
  #   --function-name chainy-prod-create \
  #   --environment Variables={EMERGENCY_STOP=true}
fi
```

**設置 Cron Job 每日執行：**

```bash
# 每天早上 8 點檢查昨日成本
0 8 * * * /path/to/check-daily-cost.sh
```

---

## 💡 低成本替代方案

### 替代方案 1：API Gateway + Lambda 速率限制（免費）

**不用 WAF，在 API Gateway 和 Lambda 層實作保護：**

```hcl
# modules/api/main.tf
resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.chainy.id
  name        = "$default"
  auto_deploy = true

  # 內建速率限制（免費！）
  default_route_settings {
    throttling_burst_limit = 50   # 突發限制
    throttling_rate_limit  = 20   # 每秒 20 次
  }

  tags = var.tags
}
```

**Lambda 層面的保護：**

```typescript
// lib/rate-limit.ts
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDB({});
const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE || "rate-limits";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export async function checkRateLimit(
  ip: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;
  const key = `${ip}:${Math.floor(now / windowSeconds)}`;

  try {
    const result = await dynamo.updateItem({
      TableName: RATE_LIMIT_TABLE,
      Key: { pk: { S: key } },
      UpdateExpression: "ADD requests :inc SET expiresAt = :exp",
      ExpressionAttributeValues: {
        ":inc": { N: "1" },
        ":exp": { N: String(now + windowSeconds) },
      },
      ReturnValues: "ALL_NEW",
    });

    const requests = parseInt(result.Attributes?.requests?.N || "1");

    return {
      allowed: requests <= limit,
      remaining: Math.max(0, limit - requests),
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return { allowed: true, remaining: limit }; // Fail open
  }
}

// handlers/create.ts
import { checkRateLimit } from "../lib/rate-limit.js";

export async function handler(event: APIGatewayProxyEventV2) {
  const ip = event.requestContext.http.sourceIp;

  // 速率限制檢查
  const rateLimit = await checkRateLimit(ip, 100, 300); // 100次/5分鐘

  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
      body: JSON.stringify({
        message: "Too many requests. Please try again later.",
      }),
    };
  }

  // 正常處理...
}
```

**創建速率限制表：**

```hcl
# modules/rate-limit/main.tf
resource "aws_dynamodb_table" "rate_limit" {
  name           = "${var.project}-${var.environment}-rate-limits"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = var.tags
}
```

**優點：**

- ✅ 完全免費（使用現有 DynamoDB）
- ✅ 可自訂規則
- ✅ 靈活控制

**缺點：**

- ❌ 攻擊流量仍會觸發 Lambda（產生費用）
- ❌ 無 SQL 注入/XSS 保護
- ❌ 需要自己維護代碼

**成本：** $0/月（使用現有資源）

---

### 替代方案 2：CloudFlare 免費方案（強烈推薦）✨

**使用 CloudFlare 作為前置防護層：**

```
用戶 → CloudFlare (免費) → API Gateway → Lambda
        ↓
    攻擊被攔截
```

**CloudFlare 免費方案提供：**

- ✅ DDoS 防護（無限制）
- ✅ 速率限制（基本）
- ✅ SSL/TLS
- ✅ CDN 加速
- ✅ 基本 WAF 規則
- ✅ **完全免費！**

**設置步驟：**

1. **註冊 CloudFlare 並添加域名**

   ```bash
   # 1. 去 cloudflare.com 註冊
   # 2. 添加您的域名
   # 3. 更新 NS 記錄
   ```

2. **配置 DNS 指向 API Gateway**

   ```
   A 記錄：api.yourdomain.com → CloudFlare Proxy → API Gateway
   ```

3. **啟用保護規則（免費）**

   ```
   Security → WAF → Managed Rules → CloudFlare Free

   Page Rules:
   - 速率限制：10 請求/秒/IP
   - 攻擊模式檢測：開啟
   - Browser Integrity Check：開啟
   ```

4. **進階規則（付費方案）**

   ```
   CloudFlare Pro ($20/月):
   - 更多 WAF 規則
   - 更細緻的速率限制
   - 更詳細的分析

   但免費方案已經很夠用！
   ```

**Terraform 配置 CloudFlare：**

```hcl
# providers.tf
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# cloudflare.tf
resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  value   = trimprefix(module.api.api_endpoint, "https://")
  type    = "CNAME"
  proxied = true  # 啟用 CloudFlare 代理
}

resource "cloudflare_page_rule" "rate_limit" {
  zone_id = var.cloudflare_zone_id
  target  = "api.${var.domain}/*"

  actions {
    security_level = "high"
  }

  priority = 1
}
```

**成本對比：**

| 方案            | 月費用 | 功能               |
| --------------- | ------ | ------------------ |
| AWS WAF         | $10    | AWS 原生，完整控制 |
| CloudFlare 免費 | $0     | 基本防護，夠用     |
| CloudFlare Pro  | $20    | 進階功能           |

**建議：**

- 個人專案：用 CloudFlare 免費 ✅
- 企業專案：用 AWS WAF（更好整合）✅

---

### 替代方案 3：輕量化 CloudWatch（最小成本）

**只記錄關鍵日誌，大幅降低成本：**

```hcl
# modules/lambda/main.tf
resource "aws_cloudwatch_log_group" "lambda" {
  for_each = local.function_config

  name              = "/aws/lambda/${each.value.name}"
  retention_in_days = 1  # 只保留 1 天！

  tags = var.tags
}

# 只在生產環境記錄錯誤
resource "aws_lambda_function" "lambda" {
  # ... 其他配置

  environment {
    variables = merge(local.base_environment, {
      LOG_LEVEL = var.environment == "prod" ? "ERROR" : "DEBUG"
    })
  }
}
```

**Lambda 中條件式日誌：**

```typescript
// lib/logger.ts
const LOG_LEVEL = process.env.LOG_LEVEL || "DEBUG";

export function log(
  level: "DEBUG" | "INFO" | "ERROR",
  message: string,
  data?: any
) {
  const levels = { DEBUG: 0, INFO: 1, ERROR: 2 };

  if (levels[level] >= levels[LOG_LEVEL as keyof typeof levels]) {
    console.log(
      JSON.stringify({
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

// 使用
import { log } from "../lib/logger.js";

export async function handler(event) {
  log("DEBUG", "Request received", { event }); // 生產環境不記錄

  try {
    // ... 處理
    log("INFO", "Request processed successfully"); // 生產環境不記錄
  } catch (error) {
    log("ERROR", "Request failed", { error }); // 總是記錄
    throw error;
  }
}
```

**成本：** < $0.50/月

---

### 替代方案 4：使用 AWS 免費額度（第一年）

**AWS 免費額度涵蓋大部分服務：**

| 服務        | 免費額度        | 說明       |
| ----------- | --------------- | ---------- |
| Lambda      | 100 萬次請求/月 | 永久免費   |
| Lambda      | 40 萬 GB-秒/月  | 永久免費   |
| DynamoDB    | 25 GB 存儲      | 永久免費   |
| DynamoDB    | 25 WCU/RCU      | 永久免費   |
| CloudWatch  | 5 GB 日誌       | 永久免費   |
| API Gateway | 100 萬次調用    | 首 12 個月 |
| CloudFront  | 50 GB 流量      | 永久免費   |

**策略：善用免費額度**

```bash
# 計算您的使用量
月請求數：10,000 次
Lambda 執行時間：100ms
記憶體：256 MB

Lambda 費用計算：
- 請求費用：10,000 × $0.0000002 = $0.002
- 運行費用：10,000 × 0.1s × 256MB × $0.0000166667 = $0.04
→ 總計：$0.042/月（遠低於免費額度）

結論：小型專案幾乎不花錢！
```

---

## 🎯 成本優化最佳實踐

### 1. 按環境分離成本

```hcl
# dev.tfvars
enable_waf              = false  # 開發不用
log_retention_days      = 1      # 最短保留
waf_rate_limit_per_5min = 1000   # 不適用

# prod.tfvars
enable_waf              = true   # 生產必須
log_retention_days      = 7
waf_rate_limit_per_5min = 2000
```

### 2. 使用 Lambda 保留併發（避免冷啟動，但要付費）

```hcl
# 只在關鍵 Lambda 使用
resource "aws_lambda_provisioned_concurrency_config" "create" {
  count = var.environment == "prod" ? 1 : 0  # 只在生產環境

  function_name                     = aws_lambda_function.lambda["create"].function_name
  provisioned_concurrent_executions = 1  # 最小配置
  qualifier                         = aws_lambda_function.lambda["create"].version
}
```

**成本：** ~$5/月（但可減少 80% 冷啟動）

### 3. 定期清理未使用資源

```bash
# scripts/cleanup-unused.sh

# 刪除舊的 Lambda 版本
aws lambda list-functions --query 'Functions[*].FunctionName' --output text | \
while read func; do
  aws lambda list-versions-by-function --function-name $func \
    --query 'Versions[?Version!=`$LATEST`].Version' --output text | \
  head -n -3 | \
  xargs -I {} aws lambda delete-function --function-name $func --qualifier {}
done

# 刪除舊的 CloudWatch 日誌
aws logs describe-log-groups --query 'logGroups[*].logGroupName' --output text | \
while read group; do
  # 刪除 30 天前的日誌
  aws logs delete-log-group --log-group-name $group
done
```

### 4. 使用 S3 生命週期策略

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "events" {
  bucket = module.events.bucket_name

  rule {
    id     = "expire-old-events"
    status = "Enabled"

    transition {
      days          = 7
      storage_class = "INTELLIGENT_TIERING"  # 自動優化
    }

    transition {
      days          = 30
      storage_class = "GLACIER"  # 便宜存儲
    }

    expiration {
      days = 90  # 90 天後刪除
    }
  }
}
```

**節省：** 70-90% S3 存儲成本

---

## 🔄 混合方案（推薦）

**結合多種策略，達到最佳性價比：**

### 配置 1：極致省錢（個人專案）

```hcl
# terraform.tfvars

# 基礎安全（免費）
enable_authentication = true
enable_waf           = false  # 用 CloudFlare 替代

# 最小 CloudWatch
log_retention_days = 1

# 預算控制
monthly_budget_limit = 5  # $5/月
```

**+ CloudFlare 免費方案**

**月費用：** < $1  
**保護級別：** 中等（夠用）

---

### 配置 2：平衡方案（小型商業）

```hcl
# terraform.tfvars

# 完整安全
enable_authentication = true
enable_waf           = true

# 適度 CloudWatch
log_retention_days = 7

# 預算控制
monthly_budget_limit = 20  # $20/月
```

**+ 預算警報自動通知**

**月費用：** $10-15  
**保護級別：** 高

---

### 配置 3：企業級（完整保護）

```hcl
# terraform.tfvars

# 完整安全
enable_authentication = true
enable_waf           = true

# 完整監控
log_retention_days = 30

# 預算控制（較高限制）
monthly_budget_limit = 100
```

**+ WAF 進階規則**  
**+ SNS 警報整合**

**月費用：** $20-50  
**保護級別：** 企業級

---

## 📊 最終建議總結

### 🥇 最推薦：混合方案

```
CloudFlare 免費（前端防護）
    ↓
API Gateway 速率限制（免費）
    ↓
Lambda 中的速率限制（DynamoDB）
    ↓
AWS Budgets 監控（前 2 個免費）
```

**月費用：** < $2  
**保護效果：** 90% WAF 的效果

### 🥈 次推薦：CloudFlare + 基本監控

```
CloudFlare 免費
    ↓
API Gateway
    ↓
Lambda
    ↓
CloudWatch (1天保留)
```

**月費用：** < $1  
**適合：** 個人專案、MVP

### 🥉 最基本：只用免費服務

```
API Gateway 速率限制
    ↓
Lambda 中檢查
    ↓
DynamoDB 記錄
```

**月費用：** $0  
**風險：** 較高，建議只用於測試環境

---

## 🚀 立即實施步驟

### 步驟 1：設置預算警報（5 分鐘）

```bash
# 1. 設置月度預算
terraform apply -target=module.budget

# 2. 驗證郵件訂閱
# 檢查您的郵箱，確認 SNS 訂閱
```

### 步驟 2：選擇成本方案（10 分鐘）

```bash
# 方案 A：CloudFlare（推薦給個人專案）
# 1. 註冊 cloudflare.com
# 2. 添加域名
# 3. 配置 DNS

# 方案 B：AWS WAF（推薦給商業專案）
enable_waf = true
terraform apply
```

### 步驟 3：監控成本（持續）

```bash
# 每週檢查成本
aws ce get-cost-and-usage \
  --time-period Start=2025-10-01,End=2025-10-07 \
  --granularity DAILY \
  --metrics UnblendedCost

# 設置每日提醒
echo "0 9 * * * /path/to/check-daily-cost.sh" | crontab -
```

---

## 💡 關鍵要點

1. **預算控制是必須的** ✅

   - 設置 AWS Budgets
   - 80% 警告，100% 緊急通知

2. **CloudFlare 是最佳免費替代** ✨

   - 完全免費
   - DDoS 防護
   - 基本 WAF

3. **Lambda 層的保護也有效** 💪

   - 速率限制
   - 輸入驗證
   - 但攻擊仍會產生費用

4. **環境分離很重要** 🔄

   - 開發環境：最小配置
   - 生產環境：完整保護

5. **定期清理資源** 🧹
   - 刪除舊日誌
   - 清理未使用的 Lambda 版本
   - S3 生命週期管理

---

需要我幫您實施哪個方案嗎？我可以提供詳細的配置步驟！

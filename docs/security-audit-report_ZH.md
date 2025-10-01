# Chainy 資安審查報告

**日期**：2025 年 10 月 1 日  
**版本**：1.0  
**審查人員**：開發團隊

---

## 執行摘要

本文檔提供 Chainy 短網址專案的全面資安審查，涵蓋基礎設施安全、程式碼實踐、資料保護和合規考量。

### 整體資安評分：6.5/10

**狀態**：⚠️ 適合開發環境 - 需要安全加固才能進入生產環境

---

## 1. 身份驗證與授權

### 現況

| 元件            | 安全措施         | 狀態      | 風險等級 |
| --------------- | ---------------- | --------- | -------- |
| API 端點 (CRUD) | 無               | ❌ 缺失   | **高**   |
| 重定向端點      | 無（設計為公開） | ✅ 可接受 | 低       |
| 前端            | 無身份驗證       | ❌ 缺失   | 中       |
| 管理員存取      | 未實施           | ❌ 缺失   | 高       |

### 發現的問題

#### 🔴 **嚴重：無 API 身份驗證**

**問題**：HTTP API Gateway 不支援 API Key 驗證

- 所有 `/links` CRUD 端點均可公開存取
- 任何人都可以建立、更新或刪除短網址
- 無每用戶速率限制
- 無擁有權驗證

**影響**：

- 濫用可能：無限制的連結建立
- 資料操控：未經授權的連結修改/刪除
- 資源耗盡：透過 API 調用的 DDoS 攻擊

**建議**：

**選項 1：Lambda Authorizer（推薦）**

```typescript
// 實施自定義 JWT 驗證
export async function authorizer(event: APIGatewayAuthorizerEvent) {
  const token = event.headers?.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new Error("Unauthorized");
  }

  // 驗證 JWT token
  const payload = verifyJWT(token, process.env.JWT_SECRET);

  return {
    principalId: payload.sub,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: "Allow",
          Resource: event.methodArn,
        },
      ],
    },
    context: {
      userId: payload.sub,
      email: payload.email,
    },
  };
}
```

**選項 2：AWS Cognito 整合**

```hcl
# modules/api/main.tf
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.chainy.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project}-${var.environment}-cognito-authorizer"

  jwt_configuration {
    audience = [var.cognito_client_id]
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${var.cognito_user_pool_id}"
  }
}
```

**選項 3：API Gateway API Key（需要遷移到 REST API）**

- 從 HTTP API 遷移到 REST API
- 實施 API Key + Usage Plans
- 由於性能和成本考量，不推薦

---

## 2. 資料保護

### 現況

| 資料類型   | 保護方法                           | 狀態    | 合規性 |
| ---------- | ---------------------------------- | ------- | ------ |
| Hash Salts | SSM Parameter Store (SecureString) | ✅ 良好 | 高     |
| IP 地址    | SHA-256 雜湊                       | ✅ 良好 | 高     |
| 擁有者 ID  | SHA-256 雜湊                       | ✅ 良好 | 中     |
| 錢包地址   | 部分遮罩                           | ✅ 良好 | 中     |
| 分析資料   | S3（無靜態加密）                   | ⚠️ 部分 | 中     |
| DynamoDB   | 無靜態加密                         | ❌ 缺失 | **高** |

### 發現的問題

#### 🟡 **高：DynamoDB 加密未啟用**

**問題**：DynamoDB 表格儲存資料時未啟用靜態加密

**目前程式碼**：

```hcl
# modules/db/main.tf
resource "aws_dynamodb_table" "links" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "code"

  # 缺少加密配置
}
```

**建議**：

```hcl
resource "aws_dynamodb_table" "links" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "code"

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb.arn  # 或使用 AWS 託管密鑰
  }

  point_in_time_recovery {
    enabled = true
  }
}
```

#### 🟡 **中：S3 事件 Bucket 未加密**

**建議**：

```hcl
# modules/events/main.tf
resource "aws_s3_bucket_server_side_encryption_configuration" "events" {
  bucket = aws_s3_bucket.events.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}
```

---

## 3. 網路安全

### 現況

| 元件              | 安全措施                     | 狀態        |
| ----------------- | ---------------------------- | ----------- |
| CloudFront HTTPS  | 強制執行 (redirect-to-https) | ✅ 良好     |
| API Gateway HTTPS | 強制執行                     | ✅ 良好     |
| CORS 配置         | 通配符 `*`                   | ⚠️ 過於寬鬆 |
| WAF               | 未配置                       | ❌ 缺失     |

### 發現的問題

#### 🟡 **中：CORS 通配符配置**

**目前程式碼**：

```hcl
# modules/api/main.tf
cors_configuration {
  allow_origins = ["*"]
  allow_methods = ["*"]
  allow_headers = ["content-type", "x-amz-date", "authorization", "x-api-key", "x-amz-security-token"]
  max_age       = 300
}
```

**建議**：

```hcl
cors_configuration {
  allow_origins = [
    "https://chainy.luichu.dev",
    var.additional_allowed_origins...
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
```

#### 🔴 **高：無 WAF 保護**

**影響**：

- 無防護常見 Web 攻擊（SQL 注入、XSS 等）
- WAF 層級無速率限制
- 無機器人檢測
- 無地理封鎖能力

**建議**：

建立 WAF 模組：

```hcl
# modules/waf/main.tf
resource "aws_wafv2_web_acl" "chainy" {
  name  = "${var.project}-${var.environment}-waf"
  scope = "CLOUDFRONT"  # 用於 CloudFront 分發

  default_action {
    allow {}
  }

  # AWS 託管規則
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # 速率限制規則
  rule {
    name     = "RateLimitRule"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000  # 每 5 分鐘的請求數
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
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

---

## 4. 程式碼備註與文檔

### 目前狀況

#### TypeScript/JavaScript 程式碼

✅ **良好**：

- 所有程式碼備註均為英文
- 函數有描述性備註
- 複雜邏輯有文檔說明

⚠️ **可改進**：

- 匯出函數缺少 JSDoc 備註
- 無介面/類型文檔
- 複雜演算法的行內備註有限

**建議**：添加 JSDoc 備註

````typescript
/**
 * 提取並標準化請求的元資料以供分析使用
 *
 * @param event - API Gateway 事件物件
 * @returns 套用隱私保護的標準化元資料物件
 *
 * @remarks
 * 此函數從請求中收集各種元資料，包括：
 * - IP 地址（為保護隱私而雜湊）
 * - 地理位置（粗粒度）
 * - User agent 詳細資訊
 * - Web3/加密貨幣特定標頭（錢包資訊、鏈 ID 等）
 *
 * 所有敏感資料在儲存前都會被雜湊、遮罩或標準化
 *
 * @example
 * ```typescript
 * const metadata = extractRequestMetadata(event);
 * // 返回：{ ip_hash: 'abc...', geo_country: 'US', ... }
 * ```
 */
function extractRequestMetadata(event: APIGatewayProxyEventV2) {
  // 實作...
}
````

### 文檔語言分析

**目前狀態**：

英文文檔（主要）：

- ✅ `architecture.md`
- ✅ `deployment-guide.md`
- ✅ `deployment-troubleshooting.md`
- ✅ `custom-domain-setup.md`
- ✅ `quick-reference.md`
- ✅ `troubleshooting-log.md`
- ✅ `ssm-integration-implementation.md`
- ✅ `dns-migration-lessons.md`
- ✅ `acm-dns-validation-notes.md`
- ✅ `chainy-web/docs/*`（全部英文）

中文文檔（翻譯）：

- ✅ `architecture_ZH.md`
- ✅ `troubleshooting-log_ZH.md`
- ✅ `ssm-integration-implementation_ZH.md`
- ✅ `dns-migration-lessons_ZH.md`
- ✅ `acm-dns-validation-notes_ZH.md`
- ❌ `technical-review-improvement-plan.md`（僅中文）

**建議**：

1. **維護英文作為主要文檔語言** ✅
2. **為關鍵文檔提供中文翻譯**（部分完成）
3. **為僅有中文的文檔建立英文版本**：
   - `technical-review-improvement-plan.md` → 需要英文版本

---

## 5. 資安檢查清單摘要

| 類別         | 項目                | 狀態        | 優先級  |
| ------------ | ------------------- | ----------- | ------- |
| **身份驗證** | API 身份驗證機制    | ❌ 缺失     | 🔴 嚴重 |
| **身份驗證** | 管理員身份驗證      | ❌ 缺失     | 🔴 嚴重 |
| **授權**     | 基於角色的存取控制  | ❌ 缺失     | 🟡 高   |
| **資料保護** | DynamoDB 靜態加密   | ❌ 缺失     | 🟡 高   |
| **資料保護** | S3 靜態加密         | ⚠️ 部分     | 🟡 高   |
| **資料保護** | KMS 密鑰管理        | ❌ 缺失     | 🟡 高   |
| **網路**     | WAF 實施            | ❌ 缺失     | 🔴 嚴重 |
| **網路**     | CORS 限制           | ⚠️ 過於寬鬆 | 🟡 高   |
| **網路**     | DDoS 保護           | ⚠️ 僅基本   | 🟢 中   |
| **機密**     | SSM Parameter Store | ✅ 良好     | -       |
| **機密**     | OIDC 聯合           | ✅ 良好     | -       |
| **機密**     | 儲存庫中的回退值    | ⚠️ 暴露     | 🟡 高   |
| **監控**     | CloudWatch 警報     | ❌ 缺失     | 🟡 高   |
| **監控**     | 存取日誌            | ❌ 缺失     | 🟢 中   |
| **監控**     | 安全監控            | ❌ 缺失     | 🟡 高   |
| **日誌記錄** | Lambda 日誌         | ✅ 良好     | -       |
| **日誌記錄** | 日誌保留            | ✅ 良好     | -       |
| **輸入驗證** | URL 驗證            | ✅ 良好     | -       |
| **輸入驗證** | SSRF 防護           | ❌ 缺失     | 🟡 高   |
| **輸入驗證** | XSS 防護            | ⚠️ 基本     | 🟢 中   |
| **相依性**   | 定期審查            | ❌ 缺失     | 🟢 中   |
| **相依性**   | 自動化掃描          | ❌ 缺失     | 🟢 中   |
| **合規**     | GDPR 考量           | ⚠️ 部分     | 🟡 高   |
| **合規**     | 隱私政策            | ❌ 缺失     | 🟡 高   |
| **文檔**     | 程式碼備註（英文）  | ✅ 良好     | -       |
| **文檔**     | 安全文檔            | ⚠️ 部分     | 🟢 中   |

---

## 6. 優先行動項目

### 🔴 嚴重（立即實施）

1. **實施 API 身份驗證**

   - 添加 Lambda Authorizer 或 Cognito
   - 保護 CRUD 端點
   - 預估工作量：2-3 天

2. **部署 WAF**
   - 配置 AWS WAF 規則
   - 啟用速率限制
   - 預估工作量：1 天

### 🟡 高（盡快實施）

3. **啟用靜態加密**

   - DynamoDB 加密
   - S3 bucket 加密
   - KMS 密鑰管理
   - 預估工作量：1 天

4. **限制 CORS**

   - 白名單特定來源
   - 移除通配符配置
   - 預估工作量：0.5 天

5. **添加監控與警報**

   - CloudWatch 警報
   - SNS 通知
   - 安全儀表板
   - 預估工作量：1-2 天

6. **輸入驗證強化**
   - SSRF 防護
   - 增強的 URL 驗證
   - 預估工作量：1 天

### 🟢 中（未來計劃）

7. **實施 GDPR 合規**

   - 資料刪除 API
   - 隱私政策
   - 預估工作量：2-3 天

8. **安全自動化**
   - CI/CD 安全掃描
   - 相依性審查
   - 預估工作量：1 天

---

## 7. 預估時間表

**階段 1：嚴重項目**（第 1-2 週）

- API 身份驗證
- WAF 部署
- 總計：3-4 天

**階段 2：高優先級**（第 3-4 週）

- 啟用加密
- CORS 限制
- 監控設置
- 輸入驗證
- 總計：4-5 天

**階段 3：中優先級**（第 5-6 週）

- GDPR 合規
- 安全自動化
- 總計：3-4 天

**總預估工作量**：10-13 天

---

## 8. 結論

Chainy 專案展示了幾個良好的安全實踐，特別是在資料保護和機密管理方面。然而，在身份驗證、網路安全和監控方面存在嚴重缺口，必須在生產部署前解決。

### 主要優勢

✅ 透過 SSM 進行 hash salt 管理
✅ IP/擁有者雜湊以保護隱私
✅ 部署使用 OIDC（無長期憑證）
✅ 強制執行 HTTPS
✅ 良好的程式碼文檔實踐

### 嚴重缺口

❌ 無 API 身份驗證
❌ 無 WAF 保護
❌ 缺少靜態加密（DynamoDB）
❌ 無安全監控/警報

### 建議

**開發/測試環境**：✅ 目前狀態可接受

**生產環境**：❌ 啟動前需實施階段 1 和 2 項目

---

**文檔版本**：1.0  
**下次審查日期**：2025 年 11 月 1 日  
**聯絡人**：開發團隊

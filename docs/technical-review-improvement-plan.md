# Chainy 技術審查改進計劃

## 📋 審查摘要

基於技術審查報告，以下是需要改進的關鍵問題和解決方案：

## 🔧 問題 1: Terraform Backend 配置更新

### 問題描述
`terraform init` 提示 backend `dynamodb_table` 參數過時

### 解決方案
更新 `backend.tf` 使用新的配置格式：

```hcl
backend "s3" {
  bucket         = "chainy-terraform-state-lui-20240930"
  key            = "env/chainy.tfstate"
  region         = "ap-northeast-1"
  dynamodb_table = "chainy-terraform-locks"
  encrypt        = true
  use_lockfile   = true  # 新增這行
}
```

## 🔧 問題 2: API Gateway 認證機制

### 問題描述
目前 REST API Gateway 所有路由開放匿名存取，缺乏身分驗證

### 解決方案
實作 API Key 認證機制：

#### 2.1 更新 API 模組
```hcl
# modules/api/main.tf 新增
resource "aws_apigatewayv2_api_key" "chainy" {
  name = "${local.api_name}-key"
  tags = var.tags
}

resource "aws_apigatewayv2_usage_plan" "chainy" {
  name = "${local.api_name}-usage-plan"
  
  api_stages {
    api_id = aws_apigatewayv2_api.chainy.id
    stage  = aws_apigatewayv2_stage.main.name
  }
  
  quota_settings {
    limit  = 10000
    period = "DAY"
  }
  
  throttle_settings {
    burst_limit = 100
    rate_limit  = 50
  }
  
  tags = var.tags
}

resource "aws_apigatewayv2_usage_plan_key" "chainy" {
  key_id        = aws_apigatewayv2_api_key.chainy.id
  key_type      = "API_KEY"
  usage_plan_id = aws_apigatewayv2_usage_plan.chainy.id
}
```

#### 2.2 更新路由配置
```hcl
# 為需要認證的路由添加 API Key 要求
resource "aws_apigatewayv2_route" "create" {
  for_each = toset([
    "POST /links",
    "GET /links/{code}",
    "PUT /links/{code}",
    "DELETE /links/{code}"
  ])

  api_id    = aws_apigatewayv2_api.chainy.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.links.id}"
  
  # 新增 API Key 要求
  api_key_required = true
}
```

## 🔧 問題 3: Lambda 環境變數配置

### 問題描述
需要確保 Lambda 環境變數包含 SSM 參數名稱

### 解決方案
更新 Lambda 模組的環境變數配置：

```hcl
# modules/lambda/main.tf
locals {
  base_environment = merge({
    CHAINY_ENVIRONMENT           = var.environment,
    CHAINY_TABLE_NAME            = var.table_name,
    CHAINY_EVENTS_BUCKET_NAME    = var.events_bucket_name,
    CHAINY_HASH_SALT_PARAM       = var.hash_salt_parameter_name,
    CHAINY_IP_HASH_SALT_PARAM    = var.ip_hash_salt_parameter_name,
    # 保留 fallback 環境變數
    CHAINY_HASH_SALT             = var.hash_salt_fallback,
    CHAINY_IP_HASH_SALT          = var.ip_hash_salt_fallback
  }, var.additional_environment)
}
```

## 🔧 問題 4: 日誌保留配置

### 問題描述
Lambda 日誌需要設定保留期限

### 解決方案
更新 Lambda 模組變數：

```hcl
# modules/lambda/variables.tf 新增
variable "log_retention_in_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 14
}
```

## 🔧 問題 5: 前端 Rate Limiting

### 問題描述
前端頁面需要 Rate Limit 措施

### 解決方案
在 Web 模組中新增 CloudFront 和 WAF 配置：

```hcl
# modules/web/main.tf 新增
resource "aws_wafv2_web_acl" "chainy" {
  name  = "${var.project}-${var.environment}-chainy-waf"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
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

## 🔧 問題 6: 敏感資訊保護

### 問題描述
確保敏感資訊不會洩露到 Git 或 Terraform 輸出

### 解決方案

#### 6.1 更新 .gitignore
```gitignore
# Terraform
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl
terraform.tfvars
terraform.tfvars.*
*.tfplan
*.tfplan.*

# Sensitive files
*.pem
*.key
*.crt
.env
.env.*
```

#### 6.2 更新 Terraform 輸出
```hcl
# outputs.tf - 確保不輸出敏感資訊
output "api_key_id" {
  description = "API Key ID for authentication"
  value       = module.api.api_key_id
  sensitive   = true  # 標記為敏感
}

output "api_endpoint" {
  description = "HTTP API base URL for invoking Chainy endpoints."
  value       = module.api.api_endpoint
  # 不標記為敏感，因為這是公開端點
}
```

## 🔧 問題 7: SSM Parameter Store 設定

### 問題描述
需要建立 SSM Parameter Store 參數

### 解決方案
新增 SSM 模組：

```hcl
# modules/ssm/main.tf
resource "aws_ssm_parameter" "hash_salt" {
  name  = var.hash_salt_parameter_name
  type  = "SecureString"
  value = var.hash_salt_value

  tags = var.tags
}

resource "aws_ssm_parameter" "ip_hash_salt" {
  name  = var.ip_hash_salt_parameter_name
  type  = "SecureString"
  value = var.ip_hash_salt_value

  tags = var.tags
}
```

## 🔧 問題 8: 監控和告警

### 問題描述
需要設定監控和告警機制

### 解決方案
新增 CloudWatch 監控：

```hcl
# modules/monitoring/main.tf
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project}-${var.environment}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors lambda errors"
  
  dimensions = {
    FunctionName = var.lambda_function_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "api_4xx_errors" {
  alarm_name          = "${var.project}-${var.environment}-api-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors API 4XX errors"
  
  dimensions = {
    ApiName = var.api_name
  }

  tags = var.tags
}
```

## 📋 實作優先順序

### 高優先級 (立即處理)
1. ✅ **SSM 整合** - 已完成
2. 🔄 **Terraform Backend 更新** - 需要更新
3. 🔄 **API 認證機制** - 需要實作
4. 🔄 **環境變數配置** - 需要更新

### 中優先級 (短期內處理)
5. 🔄 **日誌保留配置** - 需要設定
6. 🔄 **敏感資訊保護** - 需要檢查
7. 🔄 **SSM Parameter Store** - 需要建立

### 低優先級 (長期規劃)
8. 🔄 **前端 Rate Limiting** - 需要實作
9. 🔄 **監控和告警** - 需要設定

## 🚀 下一步行動

1. **立即執行**：
   - 更新 Terraform backend 配置
   - 實作 API Key 認證
   - 更新 Lambda 環境變數

2. **短期內完成**：
   - 建立 SSM Parameter Store 參數
   - 設定日誌保留
   - 檢查敏感資訊保護

3. **長期規劃**：
   - 實作 WAF 和 Rate Limiting
   - 設定完整的監控和告警
   - 考慮更進階的認證機制（Cognito）

## 📊 預期效果

完成這些改進後，Chainy 將具備：
- ✅ 安全的 SSM Parameter Store 整合
- ✅ API 認證和授權機制
- ✅ 適當的日誌管理和監控
- ✅ 敏感資訊保護
- ✅ Rate Limiting 和 DDoS 防護
- ✅ 完整的錯誤處理和告警機制

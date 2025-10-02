# Chainy 環境配置管理系統

## 🎯 概述

Chainy 現在支持完整的環境配置管理系統，可以輕鬆在開發環境、測試環境和生產環境之間切換。

## 📁 文件結構

```
aws/
├── config/
│   ├── environments.toml          # 環境配置文件
│   └── env-manager.sh            # 環境管理腳本
├── chainy/
│   ├── terraform.tfvars          # 當前活動的 Terraform 配置
│   ├── terraform.tfvars.development
│   ├── terraform.tfvars.production
│   └── terraform.tfvars.staging
├── chainy-web/
│   ├── .env                      # 當前活動的前端環境變數
│   ├── .env.development
│   ├── .env.production
│   └── .env.staging
└── env-switch.sh                 # 快速環境切換腳本
```

## 🔧 環境配置

### 支持的環境

1. **development** - 開發環境

   - 域名: `localhost:3000`
   - 協議: `http`
   - 日誌級別: `DEBUG`
   - 調試模式: 啟用
   - 成本優化: 關閉

2. **production** - 生產環境

   - 域名: `chainy.luichu.dev`
   - 協議: `https`
   - 日誌級別: `ERROR`
   - 調試模式: 關閉
   - 成本優化: 啟用

3. **staging** - 測試環境
   - 域名: `staging.chainy.luichu.dev`
   - 協議: `https`
   - 日誌級別: `INFO`
   - 調試模式: 啟用
   - 成本優化: 啟用

## 🚀 使用方法

### 1. 環境管理腳本

```bash
# 列出所有可用環境
./config/env-manager.sh list

# 查看環境詳情
./config/env-manager.sh show production

# 生成環境配置文件
./config/env-manager.sh generate development

# 切換到指定環境
./config/env-manager.sh switch production

# 部署指定環境
./config/env-manager.sh deploy production
```

### 2. 快速環境切換

```bash
# 切換到開發環境
./env-switch.sh dev

# 切換到生產環境
./env-switch.sh prod

# 查看當前環境
./env-switch.sh current

# 部署當前環境
./env-switch.sh deploy

# 啟動開發服務器
./env-switch.sh start
```

### 3. 手動切換

```bash
# 切換到開發環境
cp chainy/terraform.tfvars.development chainy/terraform.tfvars
cp chainy-web/.env.development chainy-web/.env

# 切換到生產環境
cp chainy/terraform.tfvars.production chainy/terraform.tfvars
cp chainy-web/.env.production chainy-web/.env
```

## ⚙️ 配置說明

### 環境配置文件 (config/environments.toml)

```toml
[development]
environment = "dev"
domain = "localhost:3000"
protocol = "http"
google_redirect_uri = "http://localhost:3000"
log_level = "DEBUG"
enable_debugging = true
cost_optimization = false

[production]
environment = "prod"
domain = "chainy.luichu.dev"
protocol = "https"
google_redirect_uri = "https://chainy.luichu.dev"
log_level = "ERROR"
enable_debugging = false
cost_optimization = true
```

### Terraform 變數文件

每個環境都會生成對應的 `terraform.tfvars.{environment}` 文件，包含：

- 環境特定配置
- Google OAuth 設置
- 成本優化設置
- 日誌保留策略
- Lambda 環境變數

### 前端環境變數文件

每個環境都會生成對應的 `.env.{environment}` 文件，包含：

- API 端點
- Google OAuth 設置
- 調試模式設置
- CORS 調試設置

## 🔄 工作流程

### 開發工作流程

1. **切換到開發環境**:

   ```bash
   ./env-switch.sh dev
   ```

2. **啟動開發服務器**:

   ```bash
   ./env-switch.sh start
   ```

3. **進行開發和測試**

### 部署工作流程

1. **切換到生產環境**:

   ```bash
   ./env-switch.sh prod
   ```

2. **部署到生產環境**:

   ```bash
   ./env-switch.sh deploy
   ```

3. **驗證部署結果**

### 測試工作流程

1. **生成測試環境配置**:

   ```bash
   ./config/env-manager.sh generate staging
   ```

2. **部署測試環境**:
   ```bash
   ./config/env-manager.sh deploy staging
   ```

## 🛡️ 安全考慮

- **敏感信息**: `terraform.tfvars` 文件包含敏感信息，不會提交到版本控制
- **環境隔離**: 每個環境都有獨立的配置和資源
- **訪問控制**: 生產環境使用更嚴格的日誌級別和成本控制

## 📊 監控和日誌

### 環境特定的監控

- **開發環境**: 詳細日誌，7 天保留
- **測試環境**: 中等日誌，3 天保留
- **生產環境**: 錯誤日誌，1 天保留

### 成本監控

- **開發環境**: $50/月預算
- **測試環境**: $20/月預算
- **生產環境**: $10/月預算

## 🔧 自定義配置

### 添加新環境

1. 在 `config/environments.toml` 中添加新環境配置
2. 運行 `./config/env-manager.sh generate <new-env>` 生成配置文件
3. 使用 `./config/env-manager.sh deploy <new-env>` 部署

### 修改現有環境

1. 編輯 `config/environments.toml` 中的環境配置
2. 重新生成配置文件
3. 重新部署環境

## 🚨 故障排除

### 常見問題

1. **配置文件不存在**:

   ```bash
   ./config/env-manager.sh generate <environment>
   ```

2. **環境切換失敗**:

   ```bash
   ./config/env-manager.sh show <environment>
   ```

3. **部署失敗**:
   - 檢查 AWS 憑證
   - 檢查 Terraform 狀態
   - 查看 CloudWatch 日誌

### 日誌位置

- **Lambda 日誌**: CloudWatch Logs
- **Terraform 日誌**: 控制台輸出
- **前端日誌**: 瀏覽器開發者工具

## 📚 相關文檔

- [Google OAuth 修復指南](GOOGLE_OAUTH_FIX_GUIDE.md)
- [Google Cloud Console 生產環境設置](GOOGLE_CLOUD_CONSOLE_PRODUCTION_SETUP.md)
- [部署指南](chainy/docs/deployment-guide.md)

# Google Cloud Console 生產環境配置指南

## 🚨 緊急修復：redirect_uri_mismatch 錯誤

### 問題描述

生產環境出現 `400: redirect_uri_mismatch` 錯誤，表示 Google Cloud Console 中配置的重定向 URI 與應用程式發送的不匹配。

### 🔧 立即修復步驟

#### 1. 前往 Google Cloud Console

1. 訪問 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇您的 Chainy 項目
3. 前往 "APIs & Services" → "Credentials"

#### 2. 編輯 OAuth 2.0 客戶端

1. 找到您的 OAuth 2.0 客戶端 ID
2. 點擊編輯（鉛筆圖標）

#### 3. 添加授權的重定向 URI

在 "授權的重定向 URI" 部分，確保包含以下 URI：

```
http://localhost:3000
https://chainy.luichu.dev
```

**重要：**

- 必須包含 `https://chainy.luichu.dev`（生產環境）
- 必須包含 `http://localhost:3000`（開發環境）
- URI 必須完全匹配，包括協議（http/https）

#### 4. 保存配置

1. 點擊 "保存"
2. 等待幾分鐘讓配置生效

### 🔍 驗證配置

#### 檢查當前配置

1. 在 Google Cloud Console 中確認重定向 URI 已正確設置
2. 檢查 OAuth 客戶端 ID 是否與 GitHub Secrets 中的一致

#### 測試登入

1. 訪問 `https://chainy.luichu.dev`
2. 嘗試 Google 登入
3. 應該不再出現 redirect_uri_mismatch 錯誤

### 📋 完整的 Google OAuth 配置清單

#### Google Cloud Console 設置

- ✅ OAuth 2.0 客戶端已創建
- ✅ 授權的重定向 URI 包含：
  - `http://localhost:3000` (開發環境)
  - `https://chainy.luichu.dev` (生產環境)
- ✅ OAuth 同意畫面已配置
- ✅ 客戶端 ID 和密鑰已獲取

#### GitHub Secrets 設置

- ✅ `GOOGLE_CLIENT_ID` - OAuth 客戶端 ID
- ✅ `GOOGLE_CLIENT_SECRET` - OAuth 客戶端密鑰

#### 應用程式配置

- ✅ 後端：`google_redirect_uri = "https://chainy.luichu.dev"`
- ✅ 前端：`VITE_GOOGLE_REDIRECT_URI=https://chainy.luichu.dev`

### 🚀 部署更新

#### 前端部署

```bash
# 推送更新的工作流程
git add .
git commit -m "Fix Google OAuth redirect URI for production"
git push origin main
```

#### 後端部署

```bash
# 確保後端使用正確的重定向 URI
# 檢查 GitHub Actions 工作流程中的 terraform.tfvars 生成
```

### 🔧 故障排除

#### 如果仍然出現錯誤

1. **檢查 URI 格式**：確保沒有多餘的斜線或空格
2. **等待配置生效**：Google Cloud Console 配置可能需要幾分鐘生效
3. **清除瀏覽器緩存**：清除 cookies 和緩存
4. **檢查域名**：確保 `chainy.luichu.dev` 正確解析

#### 常見錯誤

- `redirect_uri_mismatch`：重定向 URI 不匹配
- `invalid_client`：客戶端 ID 或密鑰錯誤
- `access_denied`：用戶拒絕授權

### 📞 需要幫助？

如果問題持續存在，請檢查：

1. Google Cloud Console 中的 OAuth 配置
2. GitHub Secrets 中的客戶端 ID 和密鑰
3. 應用程式中的重定向 URI 設置

---

**重要提醒：** 修改 Google Cloud Console 配置後，需要重新部署前端應用程式以使用新的環境變量。

# Google OAuth 2.0 配置指南

## 問題診斷

當前的 Google Client ID `1079648073253-kueo7mpri415h10dsc0fldeoecp878l6.apps.googleusercontent.com` 無效，導致 404 錯誤。

## 解決方案：創建新的 Google OAuth Client ID

### 步驟 1：訪問 Google Cloud Console

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇你的專案（或創建新專案）

### 步驟 2：啟用 Google+ API

1. 前往 **API 和服務** > **程式庫**
2. 搜尋 "Google+ API" 並啟用
3. 搜尋 "Google Identity" 並啟用

### 步驟 3：配置 OAuth 同意畫面

1. 前往 **API 和服務** > **OAuth 同意畫面**
2. 選擇 **外部** 用戶類型
3. 填寫應用程式資訊：
   - 應用程式名稱：`Chainy URL Shortener`
   - 用戶支援電子郵件：你的電子郵件
   - 開發人員聯絡資訊：你的電子郵件
4. 在 **範圍** 部分添加：
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`
5. 在 **測試使用者** 部分添加你的 Google 帳號

### 步驟 4：創建 OAuth 2.0 Client ID

1. 前往 **API 和服務** > **憑證**
2. 點擊 **建立憑證** > **OAuth 2.0 用戶端 ID**
3. 選擇 **網頁應用程式**
4. 填寫資訊：
   - 名稱：`Chainy Web Client`
   - 已授權的 JavaScript 來源：
     - `http://localhost:3000`
     - `http://localhost:5173`
     - `http://localhost:5174`
   - 已授權的重新導向 URI：
     - `http://localhost:3000/google-auth-callback.html`
     - `http://localhost:3000/`

### 步驟 5：獲取 Client ID 和 Secret

1. 複製 **用戶端 ID**（格式：`數字-字串.apps.googleusercontent.com`）
2. 複製 **用戶端密鑰**（格式：`GOCSPX-字串`）

### 步驟 6：更新配置

將新的 Client ID 和 Secret 更新到：

- `chainy-web/vite.config.js`
- `chainy/terraform.tfvars`

## 測試步驟

1. 更新配置後重啟開發服務器
2. 訪問 `http://localhost:3000`
3. 點擊 "🔑 使用 Google 登入" 按鈕
4. 應該會重定向到 Google 登錄頁面（不是 404）

## 常見問題

- **404 錯誤**：Client ID 無效或 OAuth 同意畫面未正確配置
- **CORS 錯誤**：JavaScript 來源未正確配置
- **重定向錯誤**：重定向 URI 未正確配置


# Google Cloud Console 生產環境配置指南

## 🔧 更新 Google OAuth 2.0 設置

您的 Chainy 應用現在已經上線到 `https://chainy.luichu.dev`，需要更新 Google Cloud Console 中的 OAuth 設置。

### 📋 必要步驟

1. **前往 Google Cloud Console**
   - 訪問：https://console.cloud.google.com/
   - 選擇您的專案

2. **導航到 OAuth 設置**
   - 前往 **APIs & Services** > **Credentials**
   - 找到您的 OAuth 2.0 客戶端 ID：`1079648073253-kueo7mpri415h10dsc0fldeoecp878l6.apps.googleusercontent.com`
   - 點擊該客戶端 ID 進入詳情頁面

3. **更新授權的重定向 URI**
   - 在 "Authorized redirect URIs" 部分
   - **添加**：`https://chainy.luichu.dev`
   - **保留**：`http://localhost:3000` (用於本地開發)
   - 點擊 **"SAVE"**

4. **更新授權的 JavaScript 來源**
   - 在 "Authorized JavaScript origins" 部分
   - **添加**：`https://chainy.luichu.dev`
   - **保留**：`http://localhost:3000` (用於本地開發)
   - 點擊 **"SAVE"**

### ✅ 驗證設置

更新完成後，您的 OAuth 設置應該包含：

**Authorized redirect URIs:**
- `http://localhost:3000` (開發環境)
- `https://chainy.luichu.dev` (生產環境)

**Authorized JavaScript origins:**
- `http://localhost:3000` (開發環境)
- `https://chainy.luichu.dev` (生產環境)

### 🧪 測試

1. 訪問 https://chainy.luichu.dev
2. 點擊 Google 登入按鈕
3. 完成 Google 授權流程
4. 驗證登入成功

### ⚠️ 重要提醒

- 更新設置後可能需要幾分鐘才能生效
- 如果遇到 "redirect_uri_mismatch" 錯誤，請檢查 URI 是否完全匹配
- 確保使用 HTTPS 協議（生產環境必須使用 HTTPS）

### 🔒 安全最佳實踐

- 定期輪換 OAuth 客戶端密鑰
- 監控 OAuth 使用情況
- 設置適當的 API 配額限制
- 啟用 Google Cloud 安全日誌

## 📞 故障排除

如果遇到問題：

1. **檢查 URI 格式**：確保沒有多餘的空格或字符
2. **等待生效**：設置更新後可能需要 5-10 分鐘生效
3. **清除瀏覽器快取**：強制重新整理頁面
4. **檢查控制台錯誤**：查看瀏覽器開發者工具中的錯誤信息

## 🎯 完成檢查清單

- [ ] 添加生產環境重定向 URI
- [ ] 添加生產環境 JavaScript 來源
- [ ] 保存設置
- [ ] 測試 Google 登入功能
- [ ] 驗證 URL 縮短功能正常
- [ ] 檢查錯誤日誌

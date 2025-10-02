# Google OAuth "Invalid OAuth code" 修復指南

## 問題診斷

根據 AWS Lambda 日誌分析，問題出現在 Google OAuth 客戶端密鑰配置：

```
ERROR Token exchange failed: {
  "error": "invalid_client",
  "error_description": "Unauthorized"
}
```

當前 Lambda 環境變數中的 `GOOGLE_CLIENT_SECRET` 是佔位符值：

```
"GOOGLE_CLIENT_SECRET": "GOCSPX-your_google_client_secret_here"
```

## 解決步驟

### 1. 獲取正確的 Google OAuth 客戶端密鑰

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇您的專案（或創建新專案）
3. 導航到 **APIs & Services** > **Credentials**
4. 找到您的 OAuth 2.0 客戶端 ID：`1079648073253-kueo7mpri415h10dsc0fldeoecp878l6.apps.googleusercontent.com`
5. 點擊該客戶端 ID 進入詳情頁面
6. 複製 **Client Secret**（格式類似：`GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`）

### 2. 更新 Terraform 配置

編輯 `terraform.tfvars` 文件：

```bash
# 將這行：
google_client_secret = "GOCSPX-your_google_client_secret_here"

# 替換為實際的密鑰：
google_client_secret = "GOCSPX-你的實際密鑰"
```

### 3. 重新部署 Lambda 函數

```bash
cd /Users/liyu/Programing/aws/chainy
terraform apply
```

### 4. 驗證修復

重新測試 Google 登入功能，應該不再出現 "Invalid OAuth code" 錯誤。

## 安全注意事項

- **不要**將真實的客戶端密鑰提交到版本控制系統
- 考慮使用 AWS Systems Manager Parameter Store 存儲敏感信息
- 定期輪換 OAuth 客戶端密鑰

## 替代方案：使用 Parameter Store

如果不想在 terraform.tfvars 中存儲敏感信息，可以：

1. 將密鑰存儲到 AWS Parameter Store：

```bash
aws ssm put-parameter \
  --name "/chainy/prod/google-client-secret" \
  --value "GOCSPX-你的實際密鑰" \
  --type "SecureString" \
  --region ap-northeast-1
```

2. 修改 Lambda 函數代碼從 Parameter Store 讀取密鑰

## 常見問題

**Q: 找不到客戶端密鑰？**
A: 確保您有該 OAuth 客戶端的編輯權限，並且該客戶端是 "Web application" 類型。

**Q: 密鑰格式不正確？**
A: Google OAuth 客戶端密鑰通常以 `GOCSPX-` 開頭，後跟 24 個字符。

**Q: 仍然出現錯誤？**
A: 檢查重定向 URI 是否與 Google Console 中配置的一致。

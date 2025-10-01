# 🔒 Chainy 安全功能快速參考

## 🚀 快速開始

### 啟用安全功能

```hcl
# terraform.tfvars
enable_authentication = true
enable_waf           = true
```

```bash
npm install
npm run package
cd dist/authorizer && zip -r ../../modules/authorizer/build/authorizer.zip . && cd ../..
terraform apply
```

## 📦 已實施功能

✅ **JWT 認證** - 保護 CRUD API  
✅ **AWS WAF** - 速率限制 + 攻擊防護  
✅ **CloudWatch 監控** - 錯誤和威脅警報  
✅ **前端工具** - 完整的 JWT 整合工具

## 📚 文檔

- [📖 完整實施總結](./docs/SECURITY_IMPLEMENTATION_SUMMARY_ZH.md)
- [🚀 部署指南](./docs/security-deployment-guide_ZH.md)
- [💻 JWT 整合指南](./docs/jwt-integration-guide_ZH.md)

## 🧪 快速測試

```bash
# 獲取 API URL
API_URL=$(terraform output -raw api_endpoint)

# 測試（無 token - 應該失敗）
curl -X POST "$API_URL/links" \
  -H "Content-Type: application/json" \
  -d '{"code":"test","target":"https://example.com"}'

# 測試（有 token - 應該成功）
TOKEN="your-jwt-token"
curl -X POST "$API_URL/links" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"test","target":"https://example.com"}'
```

## 💰 成本

約 **$7-14/月** 額外費用

## 🆘 故障排除

```bash
# 查看 Authorizer 日誌
aws logs tail "/aws/lambda/$(terraform output -raw authorizer_function_name)" --follow

# 查看 WAF 日誌
aws logs tail "/aws/wafv2/chainy-prod" --follow
```

## 📞 獲取幫助

完整文檔位於 `docs/` 目錄，包含詳細的部署步驟、整合指南和故障排除。

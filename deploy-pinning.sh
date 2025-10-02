#!/bin/bash

# 部署置頂功能更新
echo "🚀 開始部署置頂功能更新..."

# 進入 chainy 目錄
cd /Users/liyu/Programing/aws/chainy

# 建置 Lambda 函數
echo "📦 建置 Lambda 函數..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Lambda 函數建置失敗"
    exit 1
fi

# 部署到 AWS
echo "☁️ 部署到 AWS..."
terraform apply -auto-approve

if [ $? -ne 0 ]; then
    echo "❌ Terraform 部署失敗"
    exit 1
fi

echo "✅ 置頂功能部署完成！"
echo ""
echo "📋 部署的功能包括："
echo "   • DynamoDB 資料結構新增 pinned 欄位"
echo "   • API 端點支援置頂功能 (POST/PUT/GET)"
echo "   • 短網址列表 API 端點 (GET /links)"
echo "   • 前端 UI 新增置頂按鈕和短網址列表"
echo ""
echo "🧪 要測試置頂功能，請："
echo "   1. 登入您的 CHAINY 應用程式"
echo "   2. 點擊「我的短網址」按鈕"
echo "   3. 在短網址列表中點擊「置頂」按鈕"
echo "   4. 驗證置頂的短網址排在列表前面"

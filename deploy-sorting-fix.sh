#!/bin/bash

# 部署置頂功能排序修正
echo "🚀 開始部署置頂功能排序修正..."

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

echo "✅ 置頂功能排序修正部署完成！"
echo ""
echo "🔧 修正的問題："
echo "   • 後端排序邏輯：確保 pinned 欄位被正確處理為布林值"
echo "   • 前端排序邏輯：添加客戶端排序確保置頂項目排在前面"
echo "   • 即時排序：更新置頂狀態後立即重新排序"
echo ""
echo "📋 排序規則："
echo "   1. 置頂的短網址優先顯示"
echo "   2. 相同置頂狀態內按創建時間排序（最新的在前）"
echo "   3. 置頂狀態變更後立即重新排序"
echo ""
echo "🧪 要測試修正結果，請："
echo "   1. 登入您的 CHAINY 應用程式"
echo "   2. 點擊「我的短網址」按鈕"
echo "   3. 驗證置頂的短網址確實排在列表最前面"
echo "   4. 點擊「置頂」按鈕測試即時排序"

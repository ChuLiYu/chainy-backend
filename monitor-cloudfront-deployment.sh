#!/bin/bash

# CloudFront Deployment Monitor Script
# 監測 CloudFront 分發部署狀態

set -e

# 配置
DISTRIBUTION_ID="EOJPSKY8NNVO2"
DOMAIN="chainy.luichu.dev"
CHECK_INTERVAL=30  # 檢查間隔（秒）
MAX_ATTEMPTS=20    # 最大檢查次數

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數：打印帶顏色的消息
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

# 函數：檢查 CloudFront 狀態
check_cloudfront_status() {
    local status=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.Status' --output text 2>/dev/null)
    echo "$status"
}

# 函數：檢查網站可訪問性
check_website_access() {
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN --max-time 10 2>/dev/null || echo "000")
    echo "$http_code"
}

# 函數：獲取 CloudFront 域名
get_cloudfront_domain() {
    local domain=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.DomainName' --output text 2>/dev/null)
    echo "$domain"
}

# 主監測循環
print_status $BLUE "🚀 開始監測 CloudFront 部署狀態..."
print_status $BLUE "📋 分發 ID: $DISTRIBUTION_ID"
print_status $BLUE "🌐 域名: $DOMAIN"
print_status $BLUE "⏱️  檢查間隔: ${CHECK_INTERVAL}秒"
print_status $BLUE "🔄 最大檢查次數: $MAX_ATTEMPTS"
echo ""

attempt=1
while [ $attempt -le $MAX_ATTEMPTS ]; do
    print_status $YELLOW "📊 第 $attempt/$MAX_ATTEMPTS 次檢查..."
    
    # 檢查 CloudFront 狀態
    cloudfront_status=$(check_cloudfront_status)
    if [ $? -ne 0 ]; then
        print_status $RED "❌ 無法獲取 CloudFront 狀態"
        sleep $CHECK_INTERVAL
        ((attempt++))
        continue
    fi
    
    print_status $BLUE "☁️  CloudFront 狀態: $cloudfront_status"
    
    # 如果 CloudFront 部署完成，檢查網站可訪問性
    if [ "$cloudfront_status" = "Deployed" ]; then
        print_status $GREEN "✅ CloudFront 部署完成！"
        
        # 檢查網站可訪問性
        http_code=$(check_website_access)
        print_status $BLUE "🌐 網站 HTTP 狀態碼: $http_code"
        
        if [ "$http_code" = "200" ]; then
            print_status $GREEN "🎉 網站可正常訪問！"
            print_status $GREEN "🔗 網站地址: https://$DOMAIN"
            
            # 獲取 CloudFront 域名
            cloudfront_domain=$(get_cloudfront_domain)
            print_status $BLUE "☁️  CloudFront 域名: $cloudfront_domain"
            
            echo ""
            print_status $GREEN "🎯 部署監測完成！"
            print_status $GREEN "✅ 前端網站已恢復正常"
            exit 0
        elif [ "$http_code" = "530" ]; then
            print_status $YELLOW "⚠️  網站返回 530 錯誤，CloudFront 可能仍在更新中..."
        else
            print_status $YELLOW "⚠️  網站返回 $http_code 狀態碼，可能需要更多時間..."
        fi
    else
        print_status $YELLOW "⏳ CloudFront 仍在部署中..."
    fi
    
    echo ""
    
    # 如果不是最後一次嘗試，等待後繼續
    if [ $attempt -lt $MAX_ATTEMPTS ]; then
        print_status $BLUE "⏰ 等待 ${CHECK_INTERVAL} 秒後再次檢查..."
        sleep $CHECK_INTERVAL
    fi
    
    ((attempt++))
done

# 如果達到最大嘗試次數仍未完成
print_status $RED "❌ 監測超時！"
print_status $RED "🔄 已檢查 $MAX_ATTEMPTS 次，CloudFront 仍未完成部署"
print_status $YELLOW "💡 建議："
print_status $YELLOW "   1. 手動檢查 CloudFront 控制台"
print_status $YELLOW "   2. 檢查 AWS 服務狀態"
print_status $YELLOW "   3. 稍後重新運行此腳本"

exit 1



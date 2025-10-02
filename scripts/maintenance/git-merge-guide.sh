#!/bin/bash

# Git 分支管理和遠端合併腳本
echo "🔄 Git 分支管理和遠端合併流程"
echo ""

# 檢查當前狀態
echo "📋 當前分支狀態："
echo "後端 (chainy):"
cd /Users/liyu/Programing/aws/chainy
git branch -a
echo ""
echo "前端 (chainy-web):"
cd /Users/liyu/Programing/aws/chainy-web
git branch -a
echo ""

echo "📝 接下來的步驟："
echo ""
echo "1️⃣ 設定遠端倉庫 (請替換為您的實際 URL)："
echo "   # 後端"
echo "   cd /Users/liyu/Programing/aws/chainy"
echo "   git remote add origin https://github.com/yourusername/chainy-backend.git"
echo ""
echo "   # 前端"
echo "   cd /Users/liyu/Programing/aws/chainy-web"
echo "   git remote add origin https://github.com/yourusername/chainy-frontend.git"
echo ""

echo "2️⃣ 拉取遠端 main 分支："
echo "   # 後端"
echo "   cd /Users/liyu/Programing/aws/chainy"
echo "   git fetch origin"
echo "   git checkout main"
echo "   git pull origin main"
echo ""
echo "   # 前端"
echo "   cd /Users/liyu/Programing/aws/chainy-web"
echo "   git fetch origin"
echo "   git checkout main"
echo "   git pull origin main"
echo ""

echo "3️⃣ 合併功能分支："
echo "   # 後端"
echo "   cd /Users/liyu/Programing/aws/chainy"
echo "   git merge feature/pinning-functionality"
echo ""
echo "   # 前端"
echo "   cd /Users/liyu/Programing/aws/chainy-web"
echo "   git merge feature/ui-improvements"
echo ""

echo "4️⃣ 推送合併結果："
echo "   # 後端"
echo "   cd /Users/liyu/Programing/aws/chainy"
echo "   git push origin main"
echo ""
echo "   # 前端"
echo "   cd /Users/liyu/Programing/aws/chainy-web"
echo "   git push origin main"
echo ""

echo "🎯 目前的分支結構："
echo "後端:"
echo "  - main (空分支，準備拉取遠端)"
echo "  - feature/pinning-functionality (包含置頂功能)"
echo ""
echo "前端:"
echo "  - main (空分支，準備拉取遠端)"
echo "  - feature/ui-improvements (包含 UI 改進)"
echo ""

echo "💡 提示："
echo "- 如果遠端 main 分支有內容，會自動合併"
echo "- 如果有衝突，需要手動解決"
echo "- 合併後可以刪除功能分支：git branch -d feature/xxx"






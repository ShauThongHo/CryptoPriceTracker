#!/bin/bash
# 在 Android Termux 中执行此脚本
# Usage: bash update-from-github.sh

echo "🔄 更新 Android 服务器代码..."
echo ""

# 1. 进入项目目录
cd ~/crypto-server || { echo "❌ 找不到项目目录"; exit 1; }

# 2. 备份数据库（如果存在）
if [ -f "crypto-backend/database.json" ]; then
    echo "💾 备份数据库..."
    cp crypto-backend/database.json crypto-backend/database.json.backup
fi

# 3. 停止现有服务器
echo "⏹️  停止现有服务器..."
if command -v pm2 &> /dev/null; then
    pm2 stop crypto-server 2>/dev/null || echo "  (没有运行的 PM2 进程)"
else
    pkill -f "node.*server.js" 2>/dev/null || echo "  (没有运行的 Node 进程)"
fi

# 4. 拉取最新代码
echo "📥 拉取最新代码..."
git fetch origin
git reset --hard origin/main

# 5. 恢复数据库
if [ -f "crypto-backend/database.json.backup" ]; then
    echo "♻️  恢复数据库..."
    mv crypto-backend/database.json.backup crypto-backend/database.json
fi

# 6. 检查 dist 文件
echo ""
echo "📂 检查前端文件..."
if [ -d "crypto-backend/dist" ]; then
    file_count=$(find crypto-backend/dist -type f | wc -l)
    echo "  ✅ 找到 $file_count 个文件"
    
    # 检查是否包含硬编码 IP
    if grep -r "localhost:3000\|192\.168\.0\.88:3000" crypto-backend/dist/assets/*.js 2>/dev/null; then
        echo "  ⚠️  警告：检测到硬编码的 IP 地址"
    else
        echo "  ✅ 使用相对 URL"
    fi
else
    echo "  ❌ 找不到 dist 目录"
    exit 1
fi

# 7. 启动服务器
echo ""
echo "🚀 启动服务器..."
cd crypto-backend

if command -v pm2 &> /dev/null; then
    # 使用 PM2
    if pm2 list | grep -q "crypto-server"; then
        pm2 restart crypto-server
        echo "  ✅ 服务器已重启 (PM2)"
    else
        pm2 start server.js --name crypto-server
        echo "  ✅ 服务器已启动 (PM2)"
    fi
    echo ""
    pm2 status
else
    # 前台运行
    echo "  ⚠️  未安装 PM2，使用前台模式"
    echo "  提示：安装 PM2 以后台运行: npm install -g pm2"
    echo ""
    echo "按 Ctrl+C 停止服务器"
    node server.js
fi

echo ""
echo "✅ 更新完成！"
echo ""
echo "📱 测试访问："
echo "   http://$(hostname -I | awk '{print $1}'):3000"

# ============================================================================
# Quick Build and Deploy to Termux
# 快速构建并部署到 Termux
# ============================================================================

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          快速构建部署脚本 - Quick Build & Deploy             ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build frontend
Write-Host "🔨 步骤 1/4: 构建前端..." -ForegroundColor Yellow
Set-Location "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-pwa"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 构建完成" -ForegroundColor Green
Write-Host ""

# Step 2: Copy to backend/public
Write-Host "📦 步骤 2/4: 复制到 public 目录..." -ForegroundColor Yellow
Set-Location "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend"
if (Test-Path "public") {
    Remove-Item "public\*" -Recurse -Force
}
Copy-Item -Path "..\crypto-pwa\dist\*" -Destination "public\" -Recurse -Force
Write-Host "✅ 文件已复制" -ForegroundColor Green
Write-Host ""

# Step 3: Upload to Termux
Write-Host "📤 步骤 3/4: 上传到 Termux..." -ForegroundColor Yellow
Write-Host "需要输入 SSH 密码..." -ForegroundColor Cyan
scp -r "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend\public" u0_a356@192.168.0.54:/data/data/com.termux/files/home/crypto-server/crypto-backend/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 上传失败 - 请检查 SSH 连接" -ForegroundColor Red
    Write-Host "💡 提示: 确保 Termux SSH 服务器正在运行" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ 上传完成" -ForegroundColor Green
Write-Host ""

# Step 4: Restart server
Write-Host "🔄 步骤 4/4: 重启服务器..." -ForegroundColor Yellow
Write-Host "需要再次输入 SSH 密码..." -ForegroundColor Cyan
$restartCmd = "cd ~/crypto-server/crypto-backend; pkill -f node; nohup node server.js > server.log 2>&1 < /dev/null &"
ssh u0_a356@192.168.0.54 $restartCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ 服务器重启可能失败" -ForegroundColor Yellow
    Write-Host "💡 提示: 请手动登录 Termux 检查服务器状态" -ForegroundColor Yellow
} else {
    Write-Host "✅ 服务器已重启" -ForegroundColor Green
}
Write-Host ""

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                     🎉 部署完成！                            ║" -ForegroundColor Green  
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 访问: http://192.168.0.54:3000" -ForegroundColor Cyan
Write-Host "💡 提示: 打开 F12 控制台查看自动导入日志" -ForegroundColor Yellow
Write-Host "   日志格式: [ExchangeSync] ..." -ForegroundColor Gray
Write-Host ""

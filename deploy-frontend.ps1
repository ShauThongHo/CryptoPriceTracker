# 前端部署脚本 - Deploy Frontend to Backend
# 这个脚本会：
# 1. 清理旧的构建文件
# 2. 重新构建前端
# 3. 部署到后端的 dist 目录

$ErrorActionPreference = "Stop"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 前端部署开始" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# 路径配置
$frontendDir = "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-pwa"
$backendDir = "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend"
$frontendDist = Join-Path $frontendDir "dist"
$backendDist = Join-Path $backendDir "dist"

# 1. 清理前端构建
Write-Host ""
Write-Host "📦 步骤 1: 清理前端构建目录" -ForegroundColor Yellow
if (Test-Path $frontendDist) {
    Remove-Item -Path $frontendDist -Recurse -Force
    Write-Host "  ✅ 清理完成: $frontendDist" -ForegroundColor Green
}

# 清理 Vite 缓存
$viteCache = Join-Path $frontendDir "node_modules\.vite"
if (Test-Path $viteCache) {
    Remove-Item -Path $viteCache -Recurse -Force
    Write-Host "  ✅ 清理 Vite 缓存" -ForegroundColor Green
}

# 2. 构建前端
Write-Host ""
Write-Host "🔨 步骤 2: 构建前端" -ForegroundColor Yellow
Push-Location $frontendDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "构建失败"
    }
    Write-Host "  ✅ 前端构建成功" -ForegroundColor Green
} catch {
    Write-Host "  ❌ 构建失败: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

# 3. 清理后端 dist 目录
Write-Host ""
Write-Host "🧹 步骤 3: 清理后端部署目录" -ForegroundColor Yellow
if (Test-Path $backendDist) {
    Remove-Item -Path "$backendDist\*" -Recurse -Force
    Write-Host "  ✅ 清理完成: $backendDist" -ForegroundColor Green
}

# 4. 部署到后端
Write-Host ""
Write-Host "📂 步骤 4: 部署到后端" -ForegroundColor Yellow
Copy-Item -Path "$frontendDist\*" -Destination $backendDist -Recurse -Force
Write-Host "  ✅ 部署完成" -ForegroundColor Green

# 5. 验证部署
Write-Host ""
Write-Host "🔍 步骤 5: 验证部署" -ForegroundColor Yellow

$indexHtml = Join-Path $backendDist "index.html"
if (Test-Path $indexHtml) {
    $content = Get-Content $indexHtml -Raw
    if ($content -match 'src="/assets/(index-[^"]+\.js)"') {
        $jsFile = $matches[1]
        Write-Host "  ✅ index.html 已部署" -ForegroundColor Green
        Write-Host "  📄 引用的 JS 文件: $jsFile" -ForegroundColor Cyan
        
        $jsPath = Join-Path $backendDist "assets\$jsFile"
        if (Test-Path $jsPath) {
            $size = (Get-Item $jsPath).Length / 1KB
            Write-Host "  ✅ JS 文件存在 (大小: $([math]::Round($size, 2)) KB)" -ForegroundColor Green
            
            # 检查是否包含 ExchangeBalanceCard
            $jsContent = Get-Content $jsPath -Raw
            if ($jsContent -match "ExchangeBalance|调试信息") {
                Write-Host "  ✅ ExchangeBalanceCard 组件已打包" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  未找到 ExchangeBalanceCard 组件" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ❌ JS 文件不存在: $jsPath" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  ❌ index.html 不存在" -ForegroundColor Red
}

# 6. 测试后端 API
Write-Host ""
Write-Host "🌐 步骤 6: 测试后端连接" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://192.168.0.54:3000/" -UseBasicParsing -Headers @{"Cache-Control"="no-cache"} -TimeoutSec 5
    Write-Host "  ✅ 后端服务器正常响应 (状态码: $($response.StatusCode))" -ForegroundColor Green
    
    if ($response.Content -match $jsFile) {
        Write-Host "  ✅ 网站已更新到最新版本" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  网站可能使用了缓存，需要重启后端服务器" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  无法连接到后端: $_" -ForegroundColor Yellow
    Write-Host "  💡 请确保后端服务器正在运行" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 下一步操作:" -ForegroundColor Cyan
Write-Host "  1. 如果后端服务器正在运行，重启它以清除缓存" -ForegroundColor White
Write-Host "  2. 访问: http://192.168.0.54:3000" -ForegroundColor White
Write-Host "  3. 按 Ctrl + Shift + R 强制刷新浏览器" -ForegroundColor White
Write-Host "  4. 打开控制台 (F12) 查看 [ExchangeSync] 日志" -ForegroundColor White
Write-Host ""

# Portfolio History API 测试脚本
# 用于验证后端API是否正确返回totalCount

param(
    [string]$ServerUrl = "http://192.168.1.100:3000"  # 替换为你的服务器IP
)

Write-Host "=== Portfolio History API 测试 ===" -ForegroundColor Cyan
Write-Host "服务器: $ServerUrl" -ForegroundColor Yellow
Write-Host ""

# 测试1: 获取总数
Write-Host "1️⃣  测试 /portfolio/history/count" -ForegroundColor Green
try {
    $countResponse = Invoke-RestMethod -Uri "$ServerUrl/portfolio/history/count" -Method Get
    Write-Host "   成功! ✅" -ForegroundColor Green
    Write-Host "   Total Count: $($countResponse.count)" -ForegroundColor White
    $totalSnapshots = $countResponse.count
} catch {
    Write-Host "   失败! ❌" -ForegroundColor Red
    Write-Host "   错误: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 测试2: 获取24小时数据
Write-Host "2️⃣  测试 /portfolio/history?hours=24" -ForegroundColor Green
try {
    $historyResponse = Invoke-RestMethod -Uri "$ServerUrl/portfolio/history?hours=24" -Method Get
    Write-Host "   成功! ✅" -ForegroundColor Green
    Write-Host "   Count (in 24h): $($historyResponse.count)" -ForegroundColor White
    Write-Host "   TotalCount: $($historyResponse.totalCount)" -ForegroundColor White
    Write-Host "   Data points: $($historyResponse.data.Count)" -ForegroundColor White
    
    if ($historyResponse.totalCount) {
        Write-Host "   ✅ totalCount 字段存在!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  totalCount 字段缺失!" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   失败! ❌" -ForegroundColor Red
    Write-Host "   错误: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 测试3: 显示最近的快照
if ($historyResponse.data.Count -gt 0) {
    Write-Host "3️⃣  最近的快照数据:" -ForegroundColor Green
    $latestSnapshots = $historyResponse.data | Select-Object -First 3
    foreach ($snapshot in $latestSnapshots) {
        $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($snapshot.timestamp).LocalDateTime
        Write-Host "   📊 $timestamp - Value: `$$($snapshot.total_value.ToString('N2'))" -ForegroundColor Cyan
    }
} else {
    Write-Host "3️⃣  没有快照数据" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 诊断结果 ===" -ForegroundColor Cyan

if ($totalSnapshots -lt 2) {
    Write-Host "❌ 问题: 快照数量不足 (需要 >= 2, 当前: $totalSnapshots)" -ForegroundColor Red
    Write-Host ""
    Write-Host "解决方案:" -ForegroundColor Yellow
    Write-Host "  1. 手动触发快照: curl -X POST $ServerUrl/portfolio/snapshot/calculate" -ForegroundColor White
    Write-Host "  2. 等待5分钟让系统自动生成" -ForegroundColor White
    Write-Host "  3. 检查是否有资产: curl $ServerUrl/api/assets" -ForegroundColor White
} elseif (-not $historyResponse.totalCount) {
    Write-Host "⚠️  警告: API响应缺少 totalCount 字段" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "解决方案:" -ForegroundColor Yellow
    Write-Host "  1. 确保后端代码已更新 (git pull)" -ForegroundColor White
    Write-Host "  2. 重启服务器: pm2 restart crypto-backend" -ForegroundColor White
} else {
    Write-Host "✅ 所有测试通过!" -ForegroundColor Green
    Write-Host "   - Total snapshots: $totalSnapshots" -ForegroundColor White
    Write-Host "   - API返回totalCount: $($historyResponse.totalCount)" -ForegroundColor White
    Write-Host ""
    Write-Host "如果前端图表还是不显示，请:" -ForegroundColor Yellow
    Write-Host "  1. 打开浏览器开发者工具 (F12)" -ForegroundColor White
    Write-Host "  2. 查看 Console 标签的日志" -ForegroundColor White
    Write-Host "  3. 应该看到类似信息:" -ForegroundColor White
    Write-Host "     [usePortfolioHistory] 📊 Count in range: X, Total in DB: $totalSnapshots" -ForegroundColor Cyan
    Write-Host "     [PortfolioChart] Render state: { totalCount: $totalSnapshots, shouldShowChart: true }" -ForegroundColor Cyan
}

Write-Host ""

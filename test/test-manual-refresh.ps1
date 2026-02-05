# 测试手动刷新功能

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  测试手动刷新功能" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n1. 触发手动导入..." -ForegroundColor Yellow
$result = Invoke-RestMethod -Uri "http://192.168.0.54:3000/api/exchange/import" -Method POST

Write-Host "   成功: $($result.success)" -ForegroundColor $(if($result.success) { "Green" } else { "Red" })
Write-Host "   消息: $($result.message)" -ForegroundColor Gray
Write-Host "   资产数量: $($result.assets.count)" -ForegroundColor Yellow
Write-Host "   钱包数量: $($result.wallets.count)" -ForegroundColor Yellow

if ($result.assets.count -gt 0) {
    Write-Host "`n2. 导入的资产:" -ForegroundColor Green
    $result.assets.data | Select-Object symbol, @{N='数量';E={$_.amount}}, wallet_id | Format-Table -AutoSize
} else {
    Write-Host "`n⚠️  没有资产被导入" -ForegroundColor Yellow
    Write-Host "   可能原因:" -ForegroundColor Gray
    Write-Host "   1. API Key无效或过期" -ForegroundColor Gray
    Write-Host "   2. 交易所账户余额为0" -ForegroundColor Gray
    Write-Host "   3. API权限不足" -ForegroundColor Gray
    
    Write-Host "`n检查API Keys..." -ForegroundColor Yellow
    $keys = Invoke-RestMethod -Uri "http://192.168.0.54:3000/api/exchange/list"
    Write-Host "   已配置的API Keys: $($keys.count)" -ForegroundColor Gray
    $keys.data | ForEach-Object {
        Write-Host "   - 交易所: $($_.exchange)" -ForegroundColor Gray
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "使用方法:" -ForegroundColor Yellow
Write-Host "  手动刷新: POST http://192.168.0.54:3000/api/exchange/import" -ForegroundColor Gray
Write-Host "  自动刷新: 每30秒自动执行一次" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

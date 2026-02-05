# 添加OKX API Key脚本
# 请替换下面的值为你的实际OKX API凭证

$apiKey = "你的-API-KEY"          # 例如: 470a68b3-fe24-47a1-96ca-1fc19a9f8ef2
$apiSecret = "你的-API-SECRET"     # 例如: 15D25AA7DBCFA61DD766C6D1
$passphrase = "你的-PASSPHRASE"    # 你设置的密码

Write-Host "添加OKX API Key..." -ForegroundColor Cyan

$body = @{
    exchange = "okx"
    apiKey = $apiKey
    apiSecret = $apiSecret
    password = $passphrase
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://192.168.0.54:3000/api/exchange/apikey" -Method POST -ContentType "application/json" -Body $body
Write-Host "结果: $($result.message)" -ForegroundColor Green

Write-Host "`n测试手动导入..." -ForegroundColor Cyan
$import = Invoke-RestMethod -Uri "http://192.168.0.54:3000/api/exchange/import" -Method POST
Write-Host "导入成功: $($import.success)" -ForegroundColor Green
Write-Host "资产数量: $($import.assets.count)" -ForegroundColor Yellow

if ($import.assets.count -gt 0) {
    Write-Host "`n导入的资产:" -ForegroundColor Green
    $import.assets.data | Select-Object symbol, amount | Format-Table -AutoSize
}

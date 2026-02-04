# 部分清除數據腳本（保留 API 密鑰和價格歷史）
Write-Host "=== 部分清空數據庫工具 ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "這將清空：" -ForegroundColor Red
Write-Host "  ✓ 所有錢包 (wallets)"
Write-Host "  ✓ 所有資產 (assets)"
Write-Host "  ✓ 投資組合歷史 (portfolio_history)"
Write-Host ""
Write-Host "這將保留：" -ForegroundColor Green
Write-Host "  ✓ API 密鑰 (api_keys)"
Write-Host "  ✓ 自定義幣種 (custom_coins)"
Write-Host "  ✓ 價格歷史 (price_history)"
Write-Host ""

$confirmation = Read-Host "確定要清空錢包和資產數據嗎？ (輸入 YES 確認)"

if ($confirmation -ne "YES") {
    Write-Host "❌ 已取消操作" -ForegroundColor Red
    exit
}

$dbPath = "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend\database.json"
$backupPath = "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend\database.json.backup.$((Get-Date).ToFileTime())"

# 備份現有數據
Write-Host "📦 備份現有數據到: $backupPath" -ForegroundColor Cyan
Copy-Item $dbPath $backupPath

# 讀取現有數據庫
$db = Get-Content $dbPath -Raw | ConvertFrom-Json

# 只清空錢包、資產和投資組合歷史
$db.wallets = @()
$db.assets = @()
$db.portfolio_history = @()

# 保存修改後的數據庫
$db | ConvertTo-Json -Depth 10 | Set-Content -Path $dbPath -Encoding UTF8

Write-Host "✅ 錢包和資產數據已清空（保留了 API 密鑰和價格歷史）" -ForegroundColor Green
Write-Host ""
Write-Host "=== 下一步：同步到 Termux 服務器 ===" -ForegroundColor Yellow
Write-Host ""
Write-Host '執行：scp "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend\database.json" u0_a356@192.168.0.54:/data/data/com.termux/files/home/CryptoPrice/crypto-backend/database.json' -ForegroundColor White
Write-Host '然後：ssh u0_a356@192.168.0.54 "cd ~/CryptoPrice/crypto-backend && pkill -f node && nohup node server.js > server.log 2>&1 &"' -ForegroundColor White

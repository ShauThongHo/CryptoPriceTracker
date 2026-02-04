# 清空數據庫腳本
Write-Host "=== 清空數據庫工具 ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "這將清空以下數據：" -ForegroundColor Red
Write-Host "  - 所有錢包 (wallets)"
Write-Host "  - 所有資產 (assets)"
Write-Host "  - API 密鑰 (api_keys)"
Write-Host "  - 自定義幣種 (custom_coins)"
Write-Host "  - 投資組合歷史 (portfolio_history)"
Write-Host "  - 價格歷史 (price_history)"
Write-Host ""
Write-Host "舊數據將備份到 database.json.backup.<timestamp>" -ForegroundColor Green
Write-Host ""

$confirmation = Read-Host "確定要清空所有數據嗎？ (輸入 YES 確認)"

if ($confirmation -ne "YES") {
    Write-Host "❌ 已取消操作" -ForegroundColor Red
    exit
}

$dbPath = "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend\database.json"
$backupPath = "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend\database.json.backup.$((Get-Date).ToFileTime())"

# 備份現有數據
Write-Host "📦 備份現有數據到: $backupPath" -ForegroundColor Cyan
Copy-Item $dbPath $backupPath

# 創建空數據庫
$emptyDatabase = @"
{
  "wallets": [],
  "assets": [],
  "api_keys": [],
  "custom_coins": [],
  "portfolio_history": [],
  "price_history": [],
  "latest_prices": {}
}
"@

Set-Content -Path $dbPath -Value $emptyDatabase -Encoding UTF8

Write-Host "✅ 本地數據庫已清空" -ForegroundColor Green
Write-Host ""
Write-Host "=== 下一步：同步到 Termux 服務器 ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "選項 1：上傳並重啟（推薦）" -ForegroundColor Cyan
Write-Host "  執行以下命令：" 
Write-Host '  scp "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend\database.json" u0_a356@192.168.0.54:/data/data/com.termux/files/home/CryptoPrice/crypto-backend/database.json' -ForegroundColor White
Write-Host '  ssh u0_a356@192.168.0.54 "cd ~/CryptoPrice/crypto-backend && pkill -f node && nohup node server.js > server.log 2>&1 &"' -ForegroundColor White
Write-Host ""
Write-Host "選項 2：使用 debug 端點（如果服務器在運行）" -ForegroundColor Cyan
Write-Host "  先上傳文件，然後調用：" 
Write-Host '  Invoke-WebRequest -Uri "http://192.168.0.54:3000/debug/reload-db" -Method Post' -ForegroundColor White
Write-Host ""
Write-Host "選項 3：清除瀏覽器本地緩存" -ForegroundColor Cyan
Write-Host "  在瀏覽器中按 F12 → Application → IndexedDB → CryptoPortfolioDB → 右鍵刪除"
Write-Host "  或按 Ctrl+Shift+R 強制刷新"

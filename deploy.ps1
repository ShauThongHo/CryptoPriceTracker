# Quick Deploy Script
# Build and deploy to Termux

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "   Quick Build & Deploy to Termux" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build
Write-Host "[1/4] Building frontend..." -ForegroundColor Yellow
Set-Location "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-pwa"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Build complete" -ForegroundColor Green
Write-Host ""

# Step 2: Copy to backend/public
Write-Host "[2/4] Copying to public folder..." -ForegroundColor Yellow
Set-Location "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend"
if (Test-Path "public") {
    Remove-Item "public\*" -Recurse -Force
}
Copy-Item -Path "..\crypto-pwa\dist\*" -Destination "public\" -Recurse -Force
Write-Host "Files copied" -ForegroundColor Green
Write-Host ""

# Step 3: Upload to Termux
Write-Host "[3/4] Uploading to Termux (enter SSH password)..." -ForegroundColor Yellow
scp -r "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend\public" u0_a356@192.168.0.54:/data/data/com.termux/files/home/crypto-server/crypto-backend/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed - check SSH connection" -ForegroundColor Red
    exit 1
}
Write-Host "Upload complete" -ForegroundColor Green
Write-Host ""

# Step 4: Restart server
Write-Host "[4/4] Restarting server (enter SSH password again)..." -ForegroundColor Yellow
ssh u0_a356@192.168.0.54 "pkill -f node"
Start-Sleep -Seconds 2
ssh u0_a356@192.168.0.54 "cd ~/crypto-server/crypto-backend && nohup node server.js > server.log 2>&1 &"
Write-Host "Server restarted" -ForegroundColor Green
Write-Host ""

Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "   DEPLOY COMPLETE!" -ForegroundColor Green  
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open browser: http://192.168.0.54:3000" -ForegroundColor White
Write-Host "2. Press Ctrl+Shift+R to force refresh" -ForegroundColor White
Write-Host "3. Press F12 to open console" -ForegroundColor White
Write-Host "4. Go to Settings page and add OKX API key" -ForegroundColor White
Write-Host "5. Wait 5 seconds and watch console for:" -ForegroundColor White
Write-Host "   [ExchangeSync] Auto-import logs..." -ForegroundColor Gray
Write-Host ""

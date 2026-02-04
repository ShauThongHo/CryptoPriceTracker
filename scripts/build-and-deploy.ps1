# Build and Deploy Script for Crypto PWA
# Run this from the project root directory

Write-Host "Building Frontend..." -ForegroundColor Cyan

# Navigate to frontend directory
Push-Location crypto-pwa

# Build the React app
npm run build

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful!" -ForegroundColor Green
    
    # Return to root
    Pop-Location
    
    # Remove old dist folder from backend if it exists
    if (Test-Path "crypto-backend\dist") {
        Write-Host "Removing old dist folder..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force "crypto-backend\dist"
    }
    
    # Copy new dist folder to backend
    Write-Host "Copying dist to backend..." -ForegroundColor Cyan
    Copy-Item -Recurse "crypto-pwa\dist" "crypto-backend\dist"
    
    Write-Host ""
    Write-Host "Deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Commit: git add . && git commit -m Deploy-frontend" -ForegroundColor White
    Write-Host "   2. Push: git push" -ForegroundColor White
    Write-Host "   3. Android: cd ~/CryptoPrice/crypto-backend && git pull" -ForegroundColor White
    Write-Host "   4. Android: node server.js" -ForegroundColor White
    Write-Host "   5. Access: http://ANDROID_IP:3000" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

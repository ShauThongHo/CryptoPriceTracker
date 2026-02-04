# Deploy to Android Termux Server
# Replace with your Termux device IP and path

$TERMUX_IP = "192.168.0.54"
$TERMUX_USER = "u0_a291"  # Default Termux user, adjust if needed
$TERMUX_PORT = "8022"     # Default Termux SSH port
$TERMUX_PATH = "~/CryptoPrice/crypto-backend/dist"

$LOCAL_DIST = "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-pwa\dist"

Write-Host "Deploying to Termux..." -ForegroundColor Cyan
Write-Host "Target: $TERMUX_USER@$TERMUX_IP:$TERMUX_PORT" -ForegroundColor Yellow

# Using SCP to copy files
# You need to install OpenSSH client on Windows or use Git Bash
scp -P $TERMUX_PORT -r "$LOCAL_DIST\*" "${TERMUX_USER}@${TERMUX_IP}:${TERMUX_PATH}/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment successful!" -ForegroundColor Green
} else {
    Write-Host "Deployment failed!" -ForegroundColor Red
}

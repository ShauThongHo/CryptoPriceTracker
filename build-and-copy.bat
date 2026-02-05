@echo off
REM ============================================================================
REM Auto Build and Deploy Script
REM 自动构建并部署到 Termux
REM ============================================================================

echo ╔═══════════════════════════════════════════════════════════════╗
echo ║          自动构建部署脚本 - Auto Build ^& Deploy              ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Navigate to PWA directory
cd /d "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-pwa"
if errorlevel 1 (
    echo ❌ 错误: 无法进入 crypto-pwa 目录
    pause
    exit /b 1
)

echo 📂 当前目录: %cd%
echo.

REM Build frontend
echo 🔨 开始构建前端...
call npm run build
if errorlevel 1 (
    echo ❌ 构建失败
    pause
    exit /b 1
)

echo ✅ 构建完成
echo.

REM Copy to backend public directory
echo 📦 复制到 crypto-backend/public/...
cd /d "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend"

REM Clear old files
if exist "public\*" (
    del /q /s "public\*" >nul 2>&1
    for /d %%p in ("public\*") do rmdir "%%p" /s /q
)

REM Copy new build
xcopy /E /I /Y "..\crypto-pwa\dist\*" "public\" >nul

echo ✅ 文件已复制到 public 目录
echo.

echo 📋 构建文件:
dir /B public | findstr /C:".html" /C:".js" /C:".css" /C:"assets"
echo.

echo ✅ 本地部署完成！
echo.
echo 📤 下一步: 上传到 Termux
echo    命令:
echo    scp -r "C:\Users\hosha\Documents\GitHub\CryptoPrice\crypto-backend\public" u0_a356@192.168.0.54:/data/data/com.termux/files/home/CryptoPrice/crypto-backend/
echo.
echo    或者使用 PowerShell:
echo    .\deploy-to-termux.ps1
echo.
pause

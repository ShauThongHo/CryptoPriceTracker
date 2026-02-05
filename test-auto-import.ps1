# ============================================================================
# 测试自动导入功能
# Test Auto-Import Feature
# ============================================================================

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║            测试自动导入功能 - Test Auto-Import               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://192.168.0.54:3000"

# 1. Check server status
Write-Host "1️⃣  检查服务器状态..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "$baseUrl/status" -Method GET -TimeoutSec 5
    Write-Host "   ✅ 服务器运行中" -ForegroundColor Green
    Write-Host "      - Platform: $($status.platform)" -ForegroundColor Gray
    Write-Host "      - Uptime: $([math]::Round($status.uptime / 60, 1)) 分钟" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ 服务器未响应: $_" -ForegroundColor Red
    Write-Host "   💡 请确保 Termux 服务器正在运行" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 2. Check API keys
Write-Host "2️⃣  检查 API 密钥..." -ForegroundColor Yellow
try {
    $apiKeys = Invoke-RestMethod -Uri "$baseUrl/api/exchange/list" -Method GET
    if ($apiKeys.count -gt 0) {
        Write-Host "   ✅ 找到 $($apiKeys.count) 个 API 密钥" -ForegroundColor Green
        foreach ($key in $apiKeys.data) {
            Write-Host "      - $($key.exchange.ToUpper())" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  没有 API 密钥" -ForegroundColor Yellow
        Write-Host "   💡 请在 Settings 页面添加 OKX API 密钥" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "停止测试 - 需要先添加 API 密钥" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ 无法获取 API 密钥: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. Test exchange balance fetch
Write-Host "3️⃣  测试交易所余额获取..." -ForegroundColor Yellow
try {
    $balances = Invoke-RestMethod -Uri "$baseUrl/api/exchange/okx/balance" -Method GET
    if ($balances.success) {
        Write-Host "   ✅ 成功获取 $($balances.count) 个资产" -ForegroundColor Green
        foreach ($bal in $balances.data) {
            Write-Host "      - $($bal.symbol): $($bal.total)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ 获取余额失败: $($balances.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ API 调用失败: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. Check wallets
Write-Host "4️⃣  检查钱包状态..." -ForegroundColor Yellow
try {
    $wallets = Invoke-RestMethod -Uri "$baseUrl/api/wallets" -Method GET
    Write-Host "   钱包数量: $($wallets.count)" -ForegroundColor Cyan
    if ($wallets.count -gt 0) {
        foreach ($wallet in $wallets.data) {
            Write-Host "      - [$($wallet.id)] $($wallet.name) ($($wallet.type))" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  没有钱包 - 自动导入尚未运行" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ 无法获取钱包: $_" -ForegroundColor Red
}
Write-Host ""

# 5. Check assets
Write-Host "5️⃣  检查资产状态..." -ForegroundColor Yellow
try {
    $assets = Invoke-RestMethod -Uri "$baseUrl/api/assets" -Method GET
    Write-Host "   资产数量: $($assets.count)" -ForegroundColor Cyan
    if ($assets.count -gt 0) {
        foreach ($asset in $assets.data) {
            Write-Host "      - [$($asset.id)] $($asset.symbol): $($asset.amount)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  没有资产 - 自动导入尚未运行" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ 无法获取资产: $_" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                      测试结果总结                             ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

if ($wallets.count -eq 0 -or $assets.count -eq 0) {
    Write-Host ""
    Write-Host "⚠️  自动导入似乎未运行" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "可能原因:" -ForegroundColor White
    Write-Host "1. 前端代码未部署到 Termux" -ForegroundColor Gray
    Write-Host "2. 浏览器缓存了旧版本代码" -ForegroundColor Gray
    Write-Host "3. useExchangeSync() hook 未被调用" -ForegroundColor Gray
    Write-Host ""
    Write-Host "解决步骤:" -ForegroundColor White
    Write-Host "1. 确保运行了部署脚本: .\deploy-quick.ps1" -ForegroundColor Gray
    Write-Host "2. 打开浏览器: http://192.168.0.54:3000" -ForegroundColor Gray
    Write-Host "3. 按 Ctrl+Shift+R 强制刷新" -ForegroundColor Gray
    Write-Host "4. 按 F12 打开控制台" -ForegroundColor Gray
    Write-Host "5. 等待 5 秒，观察日志" -ForegroundColor Gray
    Write-Host "6. 应该看到: [ExchangeSync] 🔄 開始自動導入餘額..." -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✅ 自动导入功能正常！" -ForegroundColor Green
    Write-Host ""
    Write-Host "   - API 密钥: $($apiKeys.count) 个" -ForegroundColor White
    Write-Host "   - 交易所余额: $($balances.count) 个资产" -ForegroundColor White
    Write-Host "   - 钱包: $($wallets.count) 个" -ForegroundColor White
    Write-Host "   - 资产: $($assets.count) 个" -ForegroundColor White
    Write-Host ""
}

Write-Host "📖 详细排查步骤请查看: TROUBLESHOOT_AUTO_IMPORT.md"
Write-Host ""

# ============================================================================
# 自动导入功能诊断检查清单
# Auto-Import Diagnostics Checklist
# ============================================================================

## 问题现象
添加 OKX API 密钥后，交易所余额没有自动导入到钱包

## 诊断步骤

### 1. 检查前端代码是否已部署 ✓
**问题**: 修改了 Dashboard.tsx 添加 useExchangeSync() 但可能没有重新部署

**检查方法**:
```bash
# 在 Termux 上
cd ~/crypto-server/crypto-backend/public/assets
ls -lh index-*.js | tail -1
# 查看最新的 JS 文件时间戳，应该是最近的
```

**预期**: 文件时间戳应该是今天 (2026-02-05)

### 2. 检查浏览器是否使用旧缓存 ⚠️
**问题**: 浏览器可能缓存了旧的 JavaScript 文件

**解决方法**:
1. 打开 `http://192.168.0.54:3000`
2. 按 **Ctrl + Shift + R** (强制刷新，清除缓存)
3. 或者按 F12 打开开发者工具 → Network 标签 → 勾选 "Disable cache"

### 3. 检查 useExchangeSync hook 是否运行 🔍
**检查方法**:
1. 打开 `http://192.168.0.54:3000`
2. 按 **F12** 打开控制台
3. 查找以下日志:
   ```
   [ExchangeSync] 🎬 组件挂载 | Component mounted
   [ExchangeSync] 配置检查:
   [ExchangeSync]   - USE_BACKEND: true
   [ExchangeSync]   - API_BASE_URL: http://192.168.0.54:3000
   ```

**如果没有看到这些日志** → 前端代码未正确部署或浏览器缓存问题

### 4. 检查 OKX API 密钥是否存在 🔑
**检查方法**:
```bash
# 在 Termux 上
cd ~/crypto-server/crypto-backend
cat database.json | jq '.api_keys'
```

**预期输出**:
```json
[
  {
    "id": 1,
    "exchange": "okx",
    "apiKey": "470a68b3-...",
    "apiSecret": "...",
    "password": "Ho_041125011047",
    "createdAt": ...,
    "lastUsed": ...
  }
]
```

**如果为空数组** → 需要重新添加 API 密钥

### 5. 检查交易所余额是否能获取 📊
**检查方法 (在 Windows PowerShell)**:
```powershell
Invoke-RestMethod -Uri "http://192.168.0.54:3000/api/exchange/okx/balance" -Method GET
```

**预期输出**:
```json
{
  "success": true,
  "exchange": "okx",
  "count": 3,
  "data": [
    { "symbol": "XAUT", "total": 0.020231, ... },
    { "symbol": "BTC", "total": 0.001184, ... },
    { "symbol": "USDT", "total": 0.091038, ... }
  ]
}
```

**如果返回错误** → API 密钥配置问题或网络问题

### 6. 检查自动导入日志 🔄
**检查方法**:
1. 打开浏览器 F12 控制台
2. 等待 5 秒（自动同步间隔）
3. 查找以下日志:

**正常流程**:
```
[ExchangeSync] 🚀 开始同步 | Starting sync...
[ExchangeSync] 📊 总计余额数: 3
[ExchangeSync] 🔄 開始自動導入餘額...
[ExchangeSync] 📝 創建新錢包: OKX
[ExchangeSync] ➕ 新增資產: XAUT = 0.020231
[ExchangeSync] ➕ 新增資產: BTC = 0.001184
[ExchangeSync] ➕ 新增資產: USDT = 0.091038
[ExchangeSync] ✅ 自動導入完成
[ExchangeSync] ✅ 同步完成
```

**如果看到错误** → 检查错误信息，可能是:
- `Backend未启用` → .env 文件配置问题
- `No API key found` → API 密钥未保存
- `HTTP 404` → 服务器路由问题
- IndexedDB 错误 → 浏览器数据库问题

### 7. 检查钱包和资产是否创建 💰
**方法 A: 在浏览器中检查**
1. 刷新页面
2. 进入 **Portfolio** 页面
3. 应该看到 "OKX" 钱包
4. 展开钱包，应该看到 XAUT、BTC、USDT 资产

**方法 B: 在 IndexedDB 中检查**
1. F12 → Application 标签 → IndexedDB → CryptoPortfolioDB
2. 查看 `wallets` 表 → 应该有 OKX 钱包
3. 查看 `assets` 表 → 应该有 3 个资产

**方法 C: 在服务器检查**
```bash
# 在 Termux 上
cat ~/crypto-server/crypto-backend/database.json | jq '{wallets, assets}'
```

## 常见问题排查

### 问题 1: "数据库已清空但添加 API 后没反应"
**原因**: 前端代码未部署 + 浏览器缓存
**解决**:
1. 运行 `deploy-quick.ps1` 重新部署
2. 浏览器 Ctrl + Shift + R 强制刷新
3. 等待 5 秒观察控制台日志

### 问题 2: "控制台显示 Backend未启用"
**原因**: .env 文件配置错误
**解决**:
```bash
# 检查 .env 文件
cat ~/crypto-server/crypto-backend/public/.env

# 应该包含:
VITE_API_BASE_URL=http://192.168.0.54:3000
VITE_USE_BACKEND=true
VITE_SYNC_ENABLED=true
```

### 问题 3: "看到同步日志但 Portfolio 页面没有数据"
**原因**: 可能是 IndexedDB 和服务器不同步
**解决**:
1. F12 → Console
2. 运行: `localStorage.clear(); location.reload()`
3. 等待自动导入（5 秒）

### 问题 4: "每次刷新页面数据都消失"
**原因**: 使用了 server-first 策略但服务器数据未保存
**检查**:
```bash
# 查看服务器数据
cat ~/crypto-server/crypto-backend/database.json | jq '.wallets, .assets'
# 应该有数据，如果为空说明自动导入写入失败
```

## 快速修复命令

### 完整重新部署
```powershell
# 在 Windows PowerShell
cd C:\Users\hosha\Documents\GitHub\CryptoPrice
.\deploy-quick.ps1
```

### 重启 Termux 服务器
```bash
# SSH 到 Termux
ssh u0_a356@192.168.0.54
cd ~/crypto-server/crypto-backend
pkill -f node
nohup node server.js > server.log 2>&1 &
tail -f server.log  # 查看服务器日志
```

### 清除浏览器缓存并重新加载
```javascript
// 在浏览器控制台运行
localStorage.clear();
sessionStorage.clear();
indexedDB.deleteDatabase('CryptoPortfolioDB');
location.reload();
```

## 预期最终状态

### 服务器 database.json
```json
{
  "wallets": [
    {
      "id": 1,
      "name": "OKX",
      "type": "exchange",
      "exchangeName": "okx",
      "created_at": 1738729200000
    }
  ],
  "assets": [
    { "id": 1, "wallet_id": 1, "symbol": "XAUT", "amount": 0.020231, ... },
    { "id": 2, "wallet_id": 1, "symbol": "BTC", "amount": 0.001184, ... },
    { "id": 3, "wallet_id": 1, "symbol": "USDT", "amount": 0.091038, ... }
  ],
  "api_keys": [
    { "id": 1, "exchange": "okx", ... }
  ]
}
```

### 浏览器 IndexedDB
- **wallets** 表: 1 条记录 (OKX)
- **assets** 表: 3 条记录 (XAUT, BTC, USDT)

### Portfolio 页面显示
```
总价值: $XX.XX

钱包列表:
┌─ OKX (交易所) ────────── $XX.XX
│  ├─ XAUT: 0.020231 ($XX.XX)
│  ├─ BTC: 0.001184 ($XX.XX)
│  └─ USDT: 0.091038 ($0.09)
```

## 需要帮助？

如果按照上述步骤仍然无法解决，请提供:
1. 浏览器 F12 控制台的完整截图
2. 服务器 `database.json` 内容: `cat database.json | jq .`
3. 最新的服务器日志: `tail -50 server.log`

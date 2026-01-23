# 🎉 动态价格功能更新 / Dynamic Price Feature Update

## 📋 更新内容 / What's New

### ✅ 已修复 / Fixed
- **问题**：只有 5 个测试币种能获取价格
- **原因**：后端硬编码只追踪 5 个币种
- **解决**：实现动态价格获取，支持任意币种

### 🚀 新功能 / New Features

#### 1. 动态币种价格获取
- 前端可请求**任意币种**的价格
- 后端自动从 CoinGecko API 获取
- 无需重启服务器即可支持新币种

#### 2. 扩展的自动追踪列表
后端自动追踪的币种（每 5 分钟更新）：
- BTC (Bitcoin)
- ETH (Ethereum)
- USDT (Tether)
- USDC (USD Coin)
- BNB (Binance Coin)
- SOL (Solana)
- CRO (Crypto.com Chain)
- COMP (Compound)
- POL (Polygon)
- XPIN (XPIN Network)
- XAUT (Tether Gold)
- USD1 (USD1)
- XDAI (xDAI)
- STETH (Staked Ether)
- WBTC (Wrapped Bitcoin)
- MATIC (Polygon/Matic)

#### 3. 新的 API 端点

**POST /prices/batch**
- 按需获取任意币种价格
- 请求格式：
  ```json
  {
    "coin_ids": ["bitcoin", "ethereum", "dogecoin"]
  }
  ```
- 响应格式：
  ```json
  {
    "success": true,
    "count": 3,
    "data": [
      {
        "coin_id": "bitcoin",
        "price_usd": 90770,
        "change_24h": 2.5,
        "last_updated": 1769193601
      }
    ]
  }
  ```

## 🔧 部署更新 / Deploy Update

### 在 Android Termux 中执行：

```bash
cd ~/CryptoPrice
bash update-from-github.sh
```

脚本会自动：
1. 备份数据库
2. 停止旧服务器
3. 拉取最新代码
4. 恢复数据库
5. 重启服务器

### 手动更新步骤：

```bash
# 1. 进入项目目录
cd ~/CryptoPrice

# 2. 停止服务器
pm2 stop crypto-server
# 或按 Ctrl+C（如果前台运行）

# 3. 拉取最新代码
git pull origin main

# 4. 进入后端目录
cd crypto-backend

# 5. 重启服务器
pm2 restart crypto-server
# 或
node server.js
```

## ✅ 验证更新 / Verify Update

### 1. 测试自动追踪的币种：
```bash
curl http://192.168.0.54:3000/prices
```

应该返回 16 个币种（而不是之前的 5 个）。

### 2. 测试动态获取功能：

#### 在电脑 PowerShell：
```powershell
$body = @{
    coin_ids = @("dogecoin", "cardano", "polkadot")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://192.168.0.54:3000/prices/batch" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body | ConvertTo-Json -Depth 3
```

#### 在 Android Termux：
```bash
curl -X POST http://localhost:3000/prices/batch \
  -H "Content-Type: application/json" \
  -d '{"coin_ids":["dogecoin","cardano","polkadot"]}'
```

### 3. 前端测试：
1. 访问 `http://192.168.0.54:3000`
2. 添加一个新的资产（任意币种符号）
3. 价格应该自动加载

## 📝 使用说明 / Usage Guide

### 添加新币种

#### 方法 1：直接输入符号（推荐）
1. 在资产列表点击"添加资产"
2. 输入币种符号（如 DOGE、ADA、DOT）
3. 系统会自动查找对应的 CoinGecko ID
4. 如果找不到，可以使用方法 2

#### 方法 2：添加自定义映射
如果币种符号无法自动识别：

1. 前往 https://www.coingecko.com/
2. 搜索币种，查看 URL 中的 ID
   - 例如：dogecoin 的 URL 是 `/en/coins/dogecoin`
   - ID 就是 `dogecoin`
3. 在应用中添加自定义币种映射：
   - 符号：DOGE
   - CoinGecko ID：dogecoin

### 价格刷新机制

#### 自动追踪（后端定时）
- **频率**：每 5 分钟
- **币种**：TRACKED_COINS 列表中的 16 个币种
- **存储**：保存到 database.json
- **优势**：减少 API 请求，提高响应速度

#### 按需获取（前端请求）
- **触发**：添加新资产、刷新价格
- **币种**：任意 CoinGecko 支持的币种
- **缓存**：5 分钟本地缓存
- **降级**：后端失败自动切换到 CoinGecko 直连

## 🔍 故障排查 / Troubleshooting

### 问题：某些币种仍然没有价格

#### 可能原因 1：CoinGecko ID 错误
**解决**：
1. 访问 https://www.coingecko.com/
2. 搜索币种，复制正确的 ID
3. 更新自定义映射

#### 可能原因 2：币种不在 CoinGecko
**解决**：
- CoinGecko 只支持主流币种
- 可以考虑使用其他价格 API（需要代码修改）

#### 可能原因 3：API 请求限制
**症状**：
- 控制台显示 429 错误
- "Too Many Requests"

**解决**：
```bash
# 检查后端日志
pm2 logs crypto-server

# 等待几分钟后重试
# CoinGecko 免费版限制：
# - 10-30 次/分钟
# - 建议使用后端追踪的币种（已缓存）
```

### 问题：价格不更新

#### 检查后端服务
```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs crypto-server --lines 50

# 重启服务
pm2 restart crypto-server
```

#### 检查定时任务
```bash
# 查看日志中的 [FETCHER] 消息
pm2 logs crypto-server | grep FETCHER

# 应该每 5 分钟看到一次更新日志
```

#### 手动触发更新
```bash
# 重启服务器会立即触发一次更新
pm2 restart crypto-server
```

## 📚 技术细节 / Technical Details

### 架构变化

#### 之前（Before）
```
前端 → 后端 /prices (GET) → 返回 5 个币种
        └─ 只返回 TRACKED_COINS
        └─ 固定列表，无法扩展
```

#### 现在（After）
```
前端 → 后端 /prices/batch (POST)
        ├─ 接收任意币种列表
        ├─ 实时从 CoinGecko 获取
        └─ 返回所有请求的币种

后端定时任务 (每 5 分钟)
        ├─ 自动更新 16 个常用币种
        ├─ 存储到 database.json
        └─ 加速常用币种的响应
```

### 代码修改

#### 后端 (server.js)
- ✅ 新增 `POST /prices/batch` 端点
- ✅ 支持动态币种列表
- ✅ 单次最多 100 个币种

#### 后端 (fetcher.js)
- ✅ 扩展 TRACKED_COINS 到 16 个
- ✅ 保留定时更新机制

#### 前端 (priceService.ts)
- ✅ 修改 `fetchPricesFromBackend()` 使用 POST /prices/batch
- ✅ 自动转换符号到 CoinGecko ID
- ✅ 支持自定义币种映射

### API 限制

#### CoinGecko 免费版
- **频率限制**：10-30 次/分钟
- **单次请求**：最多 100 个币种
- **建议**：使用后端追踪的常用币种

#### 本项目限制
- **单次请求**：最多 100 个币种（后端强制）
- **超时**：15 秒
- **降级策略**：后端失败 → CoinGecko 直连

## 🎯 最佳实践 / Best Practices

### 1. 优先使用追踪币种
后端自动追踪的 16 个币种：
- ✅ 响应更快（已缓存）
- ✅ 减少 API 调用
- ✅ 避免触发限制

### 2. 批量添加资产
添加多个资产时：
- ✅ 一次性添加所有币种
- ❌ 避免逐个添加（触发多次 API 调用）

### 3. 合理刷新频率
- ✅ 等待 5 分钟刷新间隔
- ❌ 避免频繁手动刷新
- 💡 界面会显示剩余冷却时间

### 4. 添加自定义映射
对于不常用的币种：
- ✅ 创建自定义符号映射
- ✅ 重用相同的 CoinGecko ID
- 💡 例如：WETH → ethereum（与 ETH 相同）

## 📞 需要帮助？

### 查看日志
```bash
# 后端日志
pm2 logs crypto-server

# 只看错误
pm2 logs crypto-server --err

# 实时跟踪
pm2 logs crypto-server --lines 0
```

### 检查配置
```bash
# 查看追踪的币种
curl http://192.168.0.54:3000/prices | jq .

# 检查数据库状态
curl http://192.168.0.54:3000/db/stats
```

### 常用命令
```bash
# 重启服务
pm2 restart crypto-server

# 停止服务
pm2 stop crypto-server

# 启动服务
pm2 start server.js --name crypto-server

# 查看状态
pm2 status
```

---

## 🎉 更新完成！

现在你可以添加**任意币种**到资产列表，系统会自动获取价格。

测试建议：
1. ✅ 添加 BTC/ETH（应该立即显示价格 - 已追踪）
2. ✅ 添加 DOGE/ADA（会动态获取 - 新币种）
3. ✅ 检查控制台日志（F12 → Console）
4. ✅ 验证价格显示正确

有问题随时反馈！

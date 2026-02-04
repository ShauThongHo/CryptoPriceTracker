# 🏗️ 中心化 Portfolio History 架构

## 🎯 新架构概述

### ✅ 所有计算都在 Android 服务器完成

**设计理念**：
- ✅ Android 服务器 = **唯一的数据计算中心**
- ✅ 其他设备 = **只读客户端**，不参与计算
- ✅ 所有 portfolio history **由服务器统一计算和记录**

---

## 📊 工作流程

### 后端（Android 服务器）

```
每 5 分钟自动执行：
  ├─ 1. 获取最新价格 (updatePrices)
  ├─ 2. 读取所有资产 (getAllAssets)
  ├─ 3. 计算 portfolio 总值
  └─ 4. 保存快照到 database.json
```

**服务器日志示例**：
```
[CRON] ⏰ Running scheduled task
[FETCHER] 🔄 Fetching prices from CoinGecko...
[FETCHER]   ✅ bitcoin: $90770.00
[FETCHER]   ✅ ethereum: $2994.90
[PORTFOLIO] 📊 Calculating portfolio snapshot...
[PORTFOLIO] ✅ Snapshot saved: $12345.67 (5/5 assets with prices)
```

---

### 前端（电脑/手机客户端）

```
用户打开应用：
  ├─ 1. 从后端读取 portfolio history
  ├─ 2. 渲染图表
  └─ 3. 不做任何计算或记录
```

**客户端日志示例**：
```
[usePortfolioHistory] Loaded 288 snapshots from backend
[priceService] Portfolio snapshots are managed by backend server
```

---

## 🆕 新增功能

### 1. 服务器启动时立即计算

```bash
[STARTUP] 🚀 Fetching initial prices...
[STARTUP] ✅ Initial price fetch complete
[PORTFOLIO] 📊 Calculating portfolio snapshot...
[PORTFOLIO] ✅ Snapshot saved: $12345.67
```

### 2. 定时自动计算（每 5 分钟）

- 与价格更新同步
- 自动保留 90 天历史
- 最多 10,000 条记录

### 3. 手动触发计算（测试用）

```bash
# 立即计算并保存快照
curl -X POST http://192.168.0.54:3000/portfolio/snapshot/calculate
```

**响应**：
```json
{
  "success": true,
  "message": "Portfolio snapshot calculated and saved",
  "timestamp": 1737712800000
}
```

---

## 🔧 部署更新

### 在 Android Termux 执行：

```bash
cd ~/CryptoPrice
bash update-from-github.sh
```

更新完成后，服务器会：
1. ✅ 启动时立即计算快照
2. ✅ 每 5 分钟自动计算
3. ✅ 所有设备看到相同的历史数据

---

## 🧪 测试验证

### 1. 检查服务器日志

```bash
# Android Termux
pm2 logs crypto-server --lines 50

# 应该看到
[PORTFOLIO] 📊 Calculating portfolio snapshot...
[PORTFOLIO] ✅ Snapshot saved: $XXX.XX
```

### 2. 检查快照数据

```bash
# 查看快照数量
curl http://192.168.0.54:3000/portfolio/history/count

# 查看最新快照
curl "http://192.168.0.54:3000/portfolio/history?hours=1"
```

### 3. 手动触发计算

```bash
# 立即生成一个快照（测试用）
curl -X POST http://192.168.0.54:3000/portfolio/snapshot/calculate
```

### 4. 验证前端显示

#### 电脑浏览器（PowerShell）：
```powershell
# 1. 清除缓存
# 2. 访问 http://192.168.0.54:3000
# 3. 查看 Portfolio Chart

# 检查控制台（F12）
# 应该显示：
[usePortfolioHistory] Loaded 288 snapshots from backend
```

#### 手机浏览器：
1. 清除缓存
2. 访问 `http://192.168.0.54:3000`
3. 查看 Portfolio Chart
4. ✅ 应该显示**与电脑完全相同**的历史数据

---

## 📈 币种匹配逻辑

服务器使用内置映射表匹配币种符号和价格：

```javascript
SYMBOL_TO_ID_MAP = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'WETH': 'ethereum',    // 包装代币
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'CRO': 'crypto-com-chain',
  'COMP': 'compound-governance-token',
  'POL': 'polygon-ecosystem-token',
  'XPIN': 'xpin-network',
  'XAUT': 'tether-gold',
  'USD1': 'usd1-wlfi',
  'XDAI': 'xdai',
  'STETH': 'staked-ether',
  'WBTC': 'wrapped-bitcoin',
  'MATIC': 'matic-network',
}
```

**匹配过程**：
1. 资产符号转大写（如 `btc` → `BTC`）
2. 查找映射表 → `bitcoin`
3. 查找价格数据 → `$90,770`
4. 计算价值 → `0.1 BTC × $90,770 = $9,077`

---

## 🔍 数据流对比

### 之前（混合模式）

```
电脑前端 → 本地计算 → 保存到 IndexedDB
                     └→ 上传到服务器

手机前端 → 本地计算 → 保存到 IndexedDB
                     └→ 上传到服务器

服务器   → 存储所有设备的快照
```

**问题**：
- ❌ 数据来源混乱（多个设备上传）
- ❌ 时间戳不一致
- ❌ 可能出现重复快照

---

### 现在（中心化模式）

```
电脑前端 → 只读取服务器数据 ✅
手机前端 → 只读取服务器数据 ✅

服务器   → 唯一计算点
         ├─ 读取资产列表
         ├─ 读取价格数据
         ├─ 计算 portfolio 总值
         └─ 保存快照
```

**优势**：
- ✅ 单一数据源（服务器）
- ✅ 时间戳统一
- ✅ 所有设备显示相同数据
- ✅ 客户端更简单

---

## 🚫 废弃的功能

### 前端不再执行的操作

1. ~~`savePortfolioSnapshot()`~~ - 已移除计算逻辑
2. ~~`POST /portfolio/history`~~ - 返回 410 Gone
3. ~~本地 IndexedDB 快照存储~~ - 不再使用

### 保留的功能

- ✅ 本地 IndexedDB 仍用于钱包、资产、价格缓存
- ✅ 只有 portfolio history 由服务器管理

---

## 📊 数据存储位置

### Android 服务器（database.json）

```json
{
  "portfolio_history": [
    {
      "id": 1737712800000,
      "timestamp": 1737712800000,
      "total_value": 12345.67,
      "snapshot_data": "{...}"
    }
  ],
  "price_history": [...],
  "latest_prices": {...},
  "wallets": [...],
  "assets": [...]
}
```

### 客户端（IndexedDB）

```
wallets      ← 从服务器同步
assets       ← 从服务器同步
prices       ← 价格缓存
customCoins  ← 自定义币种
apiKeys      ← API 密钥
portfolioHistory ← 已废弃，不再使用
```

---

## 🎯 使用场景

### 场景 1：添加新资产

```
1. 手机上添加资产 → 同步到服务器
2. 等待 5 分钟（价格更新周期）
3. 服务器自动计算新快照
4. 所有设备刷新后看到新数据
```

### 场景 2：价格波动

```
每 5 分钟：
  ├─ 服务器获取最新价格
  ├─ 重新计算 portfolio 总值
  └─ 保存新快照

所有设备：
  └─ 看到价格变化在图表上反映
```

### 场景 3：多设备查看

```
电脑 → 访问 192.168.0.54:3000 → 显示图表
手机 → 访问 192.168.0.54:3000 → 显示相同图表
平板 → 访问 192.168.0.54:3000 → 显示相同图表

✅ 所有设备数据完全一致
```

---

## 🐛 故障排查

### 问题 1：没有历史数据

**检查服务器是否计算快照**：

```bash
# 查看日志
pm2 logs crypto-server | grep PORTFOLIO

# 应该看到
[PORTFOLIO] 📊 Calculating portfolio snapshot...
[PORTFOLIO] ✅ Snapshot saved: $XXX.XX
```

**如果没有日志**：

```bash
# 手动触发
curl -X POST http://192.168.0.54:3000/portfolio/snapshot/calculate

# 检查资产
curl http://192.168.0.54:3000/api/sync/assets
```

---

### 问题 2：资产有价格但总值为 0

**可能原因**：币种符号不匹配

**检查映射**：

```bash
# 查看资产列表
curl http://192.168.0.54:3000/api/sync/assets

# 查看价格列表
curl http://192.168.0.54:3000/prices

# 确认币种符号匹配
# 资产: BTC → 价格: bitcoin ✅
# 资产: DOGE → 价格: ??? ❌
```

**解决**：
1. 确保币种符号在 `SYMBOL_TO_ID_MAP` 中
2. 或者修改服务器代码添加新映射

---

### 问题 3：手机和电脑数据仍不一致

**可能原因**：浏览器缓存旧版本

**解决**：

1. **清除缓存**：
   - Chrome: Ctrl+Shift+Delete
   - 选择"缓存的图片和文件"

2. **硬刷新**：
   - 电脑: Ctrl+Shift+R
   - 手机: 长按刷新按钮 → 硬刷新

3. **验证前端版本**：
   ```javascript
   // 浏览器控制台（F12）
   console.log('检查前端代码:');
   // 搜索 "Portfolio snapshots are managed by backend server"
   // 如果找不到，说明是旧版本
   ```

---

## 💡 最佳实践

### 1. 服务器持续运行

```bash
# 使用 PM2 确保服务器不停机
pm2 start server.js --name crypto-server
pm2 save
pm2 startup

# 定期检查
pm2 status
```

### 2. 监控快照生成

```bash
# 实时查看日志
pm2 logs crypto-server --lines 0

# 每 5 分钟应该看到
[PORTFOLIO] 📊 Calculating portfolio snapshot...
[PORTFOLIO] ✅ Snapshot saved: $XXX.XX
```

### 3. 定期备份数据

```bash
# 备份 database.json
cp ~/CryptoPrice/crypto-backend/database.json \
   ~/backup/database_$(date +%Y%m%d_%H%M%S).json
```

### 4. 测试新资产

```bash
# 1. 添加资产（通过界面或 API）
# 2. 手动触发快照计算
curl -X POST http://192.168.0.54:3000/portfolio/snapshot/calculate

# 3. 验证快照
curl "http://192.168.0.54:3000/portfolio/history?hours=1" | jq '.data[-1]'
```

---

## 📚 API 参考

### GET /portfolio/history

**参数**：
- `hours` (可选): 最近 N 小时
- `start` & `end` (可选): 时间范围（毫秒）

**示例**：
```bash
# 最近 24 小时
curl "http://192.168.0.54:3000/portfolio/history?hours=24"

# 最近 7 天
curl "http://192.168.0.54:3000/portfolio/history?hours=168"
```

---

### POST /portfolio/snapshot/calculate

立即计算并保存快照（手动触发）

**示例**：
```bash
curl -X POST http://192.168.0.54:3000/portfolio/snapshot/calculate
```

**响应**：
```json
{
  "success": true,
  "message": "Portfolio snapshot calculated and saved",
  "timestamp": 1737712800000
}
```

---

### GET /portfolio/history/count

获取快照总数

**示例**：
```bash
curl http://192.168.0.54:3000/portfolio/history/count
```

**响应**：
```json
{
  "success": true,
  "count": 288
}
```

---

## 🎉 总结

### ✅ 新架构优势

1. **单一数据源**：所有计算在服务器完成
2. **数据一致性**：所有设备显示完全相同的历史
3. **简化客户端**：前端只负责显示，不计算
4. **可靠性高**：服务器定时自动计算，不依赖客户端

### 📱 用户体验

- **电脑端**：访问网站 → 立即看到完整历史
- **手机端**：访问网站 → 看到与电脑相同的历史
- **新设备**：首次访问 → 立即显示所有历史数据

### 🔮 下一步

所有 portfolio history 现在由 Android 服务器统一管理！

更新服务器后：
1. ✅ 等待 5 分钟（自动生成第一个快照）
2. ✅ 或手动触发：`curl -X POST http://192.168.0.54:3000/portfolio/snapshot/calculate`
3. ✅ 刷新浏览器查看历史图表

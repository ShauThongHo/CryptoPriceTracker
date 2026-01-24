# Portfolio History 测试指南

## 问题修复总结

### 修复的问题：
1. ✅ **图表不显示** - 修复了 `count` vs `totalCount` 的判断逻辑
2. ✅ **保存期限** - 从90天改为30天（匹配30天图表范围）
3. ✅ **自动清理** - 每次插入时自动删除30天前的数据
4. ✅ **定时清理** - 每天凌晨3点额外执行清理任务

### 系统行为：
- 📊 **每5分钟** 服务器自动保存一次 portfolio snapshot
- 🗑️ **自动清理** 只保留最近30天的数据
- 📈 **图表显示** 当数据库中有 >= 2 个快照时显示图表

---

## 在手机服务器上更新

### 1. 更新代码
```bash
cd ~/crypto-backend
git pull origin main
```

### 2. 重启服务
```bash
pm2 restart crypto-backend
pm2 logs crypto-backend
```

### 3. 检查日志输出
应该看到：
```
[CRON] 📅 Scheduling price updates every 5 minutes
[CRON] 🗑️  Scheduling daily portfolio history cleanup at 3:00 AM
[PORTFOLIO] 📊 Calculating portfolio snapshot...
[PORTFOLIO] ✅ Snapshot saved: $1234.56 (5/5 assets with prices, 10 total snapshots)
```

---

## 测试步骤

### 1. 检查当前快照数量
```bash
# 在服务器上
curl http://localhost:3000/portfolio/history/count
```

**期望输出**：
```json
{
  "success": true,
  "count": 10,
  "timestamp": 1737734400000
}
```

### 2. 查看最近24小时的快照
```bash
curl "http://localhost:3000/portfolio/history?hours=24"
```

**期望输出**：
```json
{
  "success": true,
  "count": 5,           // 最近24小时的数据点
  "totalCount": 10,     // 数据库总快照数
  "data": [
    {
      "id": 1737734400000,
      "timestamp": 1737734400000,
      "total_value": 1234.56,
      "snapshot_data": "{...}"
    }
  ],
  "timestamp": 1737734400000
}
```

### 3. 手动触发快照计算（测试）
```bash
curl -X POST http://localhost:3000/portfolio/snapshot/calculate
```

### 4. 在前端检查
1. 打开浏览器控制台（F12）
2. 刷新页面
3. 检查 Network 面板：
   - 应该只有 **1次** `/portfolio/history` 请求
   - 没有 `/portfolio/history/count` 请求
4. 检查 Console 日志：
   ```
   [usePortfolioHistory] Loaded 5 snapshots in 24h (10 total in DB)
   ```

### 5. 验证图表显示
- 如果 `totalCount >= 2`：显示图表 ✅
- 如果 `totalCount < 2`：显示 "Building Your Chart" 消息

---

## 故障排除

### 如果图表还不显示：

#### 检查1：数据库中是否有快照？
```bash
curl http://localhost:3000/portfolio/history/count
```
- 如果 `count: 0` → 等待5分钟让服务器自动生成快照
- 或手动触发：`curl -X POST http://localhost:3000/portfolio/snapshot/calculate`

#### 检查2：是否有资产？
```bash
curl http://localhost:3000/api/assets
```
- 如果 `count: 0` → 需要先添加一些资产

#### 检查3：价格是否已获取？
```bash
curl http://localhost:3000/prices
```
- 如果 `count: 0` → 等待价格更新或手动触发：`curl -X POST http://localhost:3000/fetch/now`

#### 检查4：前端环境变量
确保 `.env` 文件中：
```env
VITE_USE_BACKEND=true
VITE_API_BASE_URL=http://你的手机IP:3000
```

#### 检查5：查看浏览器控制台错误
- 打开 F12 Developer Tools
- 查看 Console 标签的错误消息
- 查看 Network 标签的请求状态

---

## 预期的定时任务行为

### 每5分钟（价格更新 + 快照保存）：
```
[CRON] Running scheduled price update...
[FETCHER] 🔄 Fetching prices for 16 tracked coins...
[FETCHER] ✅ Fetched 16/16 prices successfully
[PORTFOLIO] 📊 Calculating portfolio snapshot...
[PORTFOLIO] ✅ Snapshot saved: $1234.56 (5/5 assets with prices, 10 total snapshots)
```

### 每天凌晨3点（清理旧数据）：
```
[CRON] Running daily portfolio history cleanup...
[DB] 🗑️  Cleaned up portfolio history: 5 old records removed (keeping last 30 days)
[CRON] Cleanup complete: 5 old snapshots removed
```

---

## 数据保留策略

| 时间范围 | 数据点密度 | 数据保留 |
|---------|----------|---------|
| 24小时  | ~288个点 (5分钟/个) | ✅ 全部保留 |
| 7天     | ~2016个点 | ✅ 全部保留 |
| 30天    | ~8640个点 | ✅ 全部保留 |
| > 30天  | - | ❌ 自动删除 |

---

## 监控命令

### 实时查看服务器日志：
```bash
pm2 logs crypto-backend --lines 50
```

### 查看 PM2 状态：
```bash
pm2 status
```

### 检查数据库文件：
```bash
ls -lh ~/crypto-backend/database.json
cat ~/crypto-backend/database.json | jq '.portfolio_history | length'
```

---

## 完成后验证清单

- [ ] 服务器日志显示快照自动保存
- [ ] `/portfolio/history/count` 返回 >= 2
- [ ] 前端图表正常显示
- [ ] 只有1次 API 请求（不是3次）
- [ ] 没有429错误
- [ ] 可以切换24H/7D/30D时间范围
- [ ] 日志显示总快照数量正确

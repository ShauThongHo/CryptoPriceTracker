# 📊 Portfolio History 同步功能说明

## 🔍 问题解答

### Q: Portfolio History 数据存储在哪里？

**之前**：只存储在每个设备的**浏览器本地 IndexedDB**
- 电脑有电脑的历史
- 手机有手机的历史
- **不同步**，各自独立

**现在**：双重存储 + 自动同步
1. **本地 IndexedDB**（快速访问）
2. **Android 后端 database.json**（中央存储）
3. 自动同步到后端，所有设备共享

---

### Q: 为什么之前手机端和电脑端的 data point 不一样？

#### 原因 1：独立存储
- 每个设备的历史数据**完全独立**
- 在电脑上访问 → 只能看到电脑的历史
- 在手机上访问 → 只能看到手机的历史

#### 原因 2：快照生成时机不同
- Portfolio history 是每 5 分钟自动保存快照
- 电脑和手机使用时间不同 → 快照时刻不同
- 例如：
  - 电脑在 10:00, 10:05, 10:10 保存快照
  - 手机在 10:03, 10:08, 10:13 保存快照
  - 两者时间点不重叠

#### 原因 3：90 天自动清理
- 只保留最近 90 天的历史
- 老旧设备可能已清理部分数据
- 新设备没有历史数据

---

## ✅ 新功能：Portfolio History 同步

### 🚀 现在的工作方式

1. **保存快照时**：
   ```
   前端计算总值 → 保存到本地 IndexedDB
                  ↓
                  同时上传到 Android 后端
   ```

2. **查看历史时**：
   ```
   优先加载后端数据（所有设备共享）
   ↓
   如果后端失败，降级到本地数据
   ```

3. **数据合并策略**：
   - 后端数据优先（因为数据点最多）
   - 本地数据作为备份

---

## 📦 后端存储结构

### database.json 新增字段：

```json
{
  "portfolio_history": [
    {
      "id": 1737712800000,
      "timestamp": 1737712800000,
      "total_value": 12345.67,
      "snapshot_data": "{\"wallets\":{\"1\":5000,\"2\":7345.67},\"coins\":{\"BTC\":{\"amount\":0.1,\"value\":9077},\"ETH\":{\"amount\":1.5,\"value\":4493.85}}}"
    }
  ]
}
```

### 字段说明：
- `id`: 唯一标识（使用时间戳）
- `timestamp`: 快照时间（毫秒）
- `total_value`: 总资产价值（USD）
- `snapshot_data`: JSON 字符串，包含：
  - `wallets`: 每个钱包的价值
  - `coins`: 每种币的数量和价值

---

## 🆕 新增 API 端点

### 1. GET /portfolio/history

获取历史数据

**参数**：
- `hours` (可选): 最近 N 小时（如 `?hours=24`）
- `start` & `end` (可选): 时间范围（毫秒时间戳）

**响应**：
```json
{
  "success": true,
  "count": 288,
  "data": [
    {
      "id": 1737712800000,
      "timestamp": 1737712800000,
      "total_value": 12345.67,
      "snapshot_data": "..."
    }
  ]
}
```

**示例**：
```bash
# 最近 24 小时
curl "http://192.168.0.54:3000/portfolio/history?hours=24"

# 最近 7 天
curl "http://192.168.0.54:3000/portfolio/history?hours=168"

# 指定时间范围
curl "http://192.168.0.54:3000/portfolio/history?start=1737600000000&end=1737720000000"
```

---

### 2. POST /portfolio/history

上传快照（前端自动调用）

**请求体**：
```json
{
  "timestamp": 1737712800000,
  "totalValue": 12345.67,
  "snapshotData": "{\"wallets\":{\"1\":5000},\"coins\":{\"BTC\":{\"amount\":0.1,\"value\":9077}}}"
}
```

**响应**：
```json
{
  "success": true,
  "message": "Portfolio snapshot saved"
}
```

---

### 3. GET /portfolio/history/count

获取快照总数

**响应**：
```json
{
  "success": true,
  "count": 288
}
```

---

## 🔧 更新部署

### 在 Android Termux：

```bash
cd ~/CryptoPrice
bash update-from-github.sh
```

或手动：
```bash
cd ~/CryptoPrice
git pull origin main
cd crypto-backend
pm2 restart crypto-server
```

---

## 📈 数据同步行为

### 场景 1：全新设备

**电脑已有历史 → 手机首次访问**

1. 手机前端加载页面
2. 尝试从后端获取历史
3. 后端返回电脑保存的历史数据
4. ✅ 手机立即显示完整历史

---

### 场景 2：多设备同时使用

**电脑和手机同时运行**

1. 每 5 分钟，电脑保存快照到后端
2. 每 5 分钟，手机保存快照到后端
3. 两者的快照都存储在后端
4. ✅ 查看历史时，合并所有快照

**时间线示例**：
```
10:00 - 电脑保存快照 A
10:03 - 手机保存快照 B
10:05 - 电脑保存快照 C
10:08 - 手机保存快照 D

查看历史 → 显示 A, B, C, D 按时间排序
```

---

### 场景 3：离线使用

**手机断网 → 无法访问后端**

1. 尝试从后端加载历史 → 失败
2. 自动降级到本地 IndexedDB
3. ✅ 显示手机本地保存的历史
4. 恢复网络后，新快照继续同步到后端

---

## 🧪 测试验证

### 1. 测试后端存储

```bash
# 在 Android Termux
cd ~/CryptoPrice/crypto-backend
cat database.json | grep -A 5 "portfolio_history"
```

### 2. 测试 API

```powershell
# 在电脑 PowerShell
# 获取最近 24 小时历史
Invoke-RestMethod -Uri "http://192.168.0.54:3000/portfolio/history?hours=24" | ConvertTo-Json -Depth 5

# 获取快照数量
Invoke-RestMethod -Uri "http://192.168.0.54:3000/portfolio/history/count"
```

### 3. 测试前端显示

1. **电脑浏览器**：
   - 访问 `http://192.168.0.54:3000`
   - 查看 Portfolio Chart
   - 应该显示历史数据

2. **手机浏览器**：
   - 清除缓存
   - 访问 `http://192.168.0.54:3000`
   - 查看 Portfolio Chart
   - ✅ 应该显示与电脑**相同**的历史数据

3. **开发者控制台**（F12）：
   ```
   [usePortfolioHistory] Loaded 288 snapshots from backend
   ```

---

## 🔄 数据迁移

### 如果你已经有本地历史数据：

**方法 1：自动积累**（推荐）
- 不需要任何操作
- 新的快照会自动同步到后端
- 等待几天后，后端会积累足够的历史数据

**方法 2：手动迁移**（高级）
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 执行以下代码：

```javascript
// 导出本地历史数据
const history = await db.portfolioHistory.toArray();
console.log(JSON.stringify(history));

// 手动上传到后端（需要修改代码）
for (const item of history) {
  await fetch('http://192.168.0.54:3000/portfolio/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp: item.timestamp.getTime(),
      totalValue: item.totalValue,
      snapshotData: item.snapshotData
    })
  });
}
```

---

## 📊 数据保留策略

### 自动清理

- **保留时间**：90 天
- **清理频率**：每次保存新快照时
- **后端限制**：最多 10,000 条记录

### 手动清理（如果需要）

```bash
# 在 Android Termux
cd ~/CryptoPrice/crypto-backend
node -e "
import('./db.js').then(db => {
  const count = db.cleanupOldPortfolioHistory(30); // 保留 30 天
  console.log(\`已删除 \${count} 条旧记录\`);
});
"
```

---

## 🐛 故障排查

### 问题 1：手机仍显示不同的历史

**可能原因**：
- 浏览器缓存旧版本前端
- 后端未成功更新

**解决**：
```bash
# 1. 清除手机浏览器缓存
# 2. 重启 Android 后端
pm2 restart crypto-server

# 3. 验证后端版本
curl http://192.168.0.54:3000/portfolio/history/count
```

---

### 问题 2：历史数据为空

**检查步骤**：

1. **检查本地数据**：
   ```javascript
   // 浏览器控制台（F12）
   const count = await db.portfolioHistory.count();
   console.log('本地历史数量:', count);
   ```

2. **检查后端数据**：
   ```bash
   curl http://192.168.0.54:3000/portfolio/history/count
   ```

3. **手动触发快照**：
   - 添加/编辑资产
   - 等待 5 分钟价格刷新
   - 新快照会自动保存

---

### 问题 3：后端同步失败

**症状**：
- 控制台显示错误：`Backend sync error (non-critical)`

**不影响使用**：
- 快照仍保存到本地
- 只是未同步到后端

**排查**：
```javascript
// 浏览器控制台
// 检查后端连接
fetch('http://192.168.0.54:3000/health')
  .then(r => r.json())
  .then(console.log);
```

---

## 💡 最佳实践

### 1. 保持后端运行
- 使用 PM2 确保服务器持续运行
- 定期检查：`pm2 status`

### 2. 定期检查数据
```bash
# 查看后端历史数量
curl -s http://192.168.0.54:3000/portfolio/history/count | jq .

# 查看最新快照
curl -s "http://192.168.0.54:3000/portfolio/history?hours=1" | jq '.data[-1]'
```

### 3. 备份重要数据
```bash
# 定期备份 database.json
cp ~/CryptoPrice/crypto-backend/database.json ~/backup/database_$(date +%Y%m%d).json
```

---

## 🎉 总结

### ✅ 现在的优势

1. **统一历史**：所有设备显示相同的 portfolio history
2. **自动同步**：每次价格刷新自动上传快照
3. **降级策略**：后端失败时使用本地数据
4. **数据持久化**：Android 后端保存所有快照
5. **新设备友好**：新设备立即获得完整历史

### 📱 使用体验

- **电脑上**：添加资产 → 5 分钟后 → 快照自动上传
- **手机上**：打开应用 → 立即显示与电脑相同的历史图表
- **离线模式**：断网时 → 显示本地历史 → 恢复网络后继续同步

---

## 🔜 未来改进

可选的增强功能：

1. **批量初始化**：首次运行时，上传所有本地历史
2. **冲突解决**：智能合并不同设备的快照
3. **压缩存储**：减少 database.json 文件大小
4. **实时同步**：WebSocket 推送新快照到所有设备

---

需要帮助？查看日志：
```bash
# Android 后端日志
pm2 logs crypto-server

# 浏览器控制台
# F12 → Console → 搜索 "portfolio"
```

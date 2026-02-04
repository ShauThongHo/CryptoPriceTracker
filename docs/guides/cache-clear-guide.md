# 清除手机浏览器缓存指南 / Clear Mobile Browser Cache

## 问题症状 / Symptoms
- 电脑可以正常访问
- 手机显示"离线模式：后端离线"
- 这是因为手机浏览器缓存了旧版本

## 解决方案 / Solutions

### 方案 1：强制刷新页面 (推荐)
1. 在手机浏览器中打开 `http://192.168.0.54:3000`
2. **Android Chrome**:
   - 点击右上角 ⋮ (三个点)
   - 勾选"桌面版网站" (Desktop site)
   - 长按刷新按钮 🔄
   - 选择"清空缓存并硬性重新加载"
   
3. **iOS Safari**:
   - 长按地址栏的刷新按钮
   - 或者清除网站数据（设置 → Safari → 高级 → 网站数据 → 移除所有数据）

### 方案 2：清除浏览器数据
**Android Chrome:**
1. 点击右上角 ⋮ → 设置
2. 隐私和安全 → 清除浏览数据
3. 选择"缓存的图片和文件"、"Cookie和网站数据"
4. 时间范围选择"全部时间"
5. 点击"清除数据"

**iOS Safari:**
1. 设置 → Safari
2. 清除历史记录和网站数据
3. 确认清除

### 方案 3：使用隐私/无痕模式测试
1. 打开隐私浏览模式（新的无痕标签页）
2. 访问 `http://192.168.0.54:3000`
3. 如果正常，说明是缓存问题

### 方案 4：在 URL 后加版本参数
访问: `http://192.168.0.54:3000/?v=2`

这会绕过缓存加载新版本。

## 验证修复
访问后检查：
- 左上角是否显示"已连接"（绿色）
- 价格数据是否实时更新
- 网络标签中是否能看到 API 请求

## 预防措施
每次更新前端后，在 Android 服务器上：
```bash
# 清除旧的 Service Worker 缓存
rm -rf ~/CryptoPrice/crypto-backend/dist/sw.js
rm -rf ~/CryptoPrice/crypto-backend/dist/workbox-*.js

# 然后 pull 最新代码
git pull
```

## 开发者工具检查（Chrome）
1. F12 打开开发者工具
2. Application → Service Workers → Unregister
3. Application → Storage → Clear site data
4. Network 标签查看请求是否发送到正确的 IP

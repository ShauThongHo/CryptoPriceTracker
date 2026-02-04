# 更新 Android 服务器代码 / Update Android Server Code

## 🔄 快速更新步骤

### 在 Android Termux 中执行：

```bash
# 1. 进入项目目录
cd ~/CryptoPrice

# 2. 拉取最新代码
git pull origin main

# 3. 停止当前服务器（如果正在运行）
# 方法A：如果使用 PM2
pm2 stop crypto-server

# 方法B：如果在终端前台运行
# 按 Ctrl+C 停止

# 4. 删除旧的前端构建
rm -rf crypto-backend/dist

# 5. 重新构建前端（在电脑上执行，见下方）
# ...等待电脑构建完成...

# 6. 再次拉取（包含新构建的 dist 文件）
git pull origin main

# 7. 重启服务器
cd crypto-backend

# 方法A：使用 PM2（推荐）
pm2 restart crypto-server
# 或者第一次启动
pm2 start server.js --name crypto-server

# 方法B：前台运行（测试用）
node server.js
```

---

## 💻 在电脑上重新构建前端

### PowerShell 执行：

```powershell
# 1. 进入项目根目录
cd C:\Users\hosha\Documents\GitHub\CryptoPrice

# 2. 确认 .env 配置
Get-Content crypto-pwa\.env
# 应该显示：VITE_API_BASE_URL=
# （空值表示使用相对URL）

# 3. 运行构建脚本
.\build-and-deploy.ps1

# 4. 提交并推送到 GitHub
git add crypto-backend/dist
git commit -m "Rebuild frontend with relative URLs"
git push origin main
```

---

## ✅ 验证步骤

### 1. 检查本地构建是否正确

```powershell
# 在电脑上检查构建文件
$js = Get-Content "crypto-backend\dist\assets\index-*.js" -Raw
if ($js -match "localhost:3000") {
    Write-Host "❌ 构建失败：仍包含 localhost:3000" -ForegroundColor Red
} else {
    Write-Host "✅ 构建成功：使用相对 URL" -ForegroundColor Green
}
```

### 2. 检查 Android 服务器是否更新

```powershell
# 从电脑测试 Android 服务器
$content = Invoke-WebRequest -Uri "http://192.168.0.54:3000/assets/index-*.js" -UseBasicParsing
if ($content.Content -match "localhost:3000") {
    Write-Host "❌ Android 服务器未更新" -ForegroundColor Red
} else {
    Write-Host "✅ Android 服务器已更新" -ForegroundColor Green
}
```

### 3. 测试手机访问

1. **清除手机浏览器缓存**（重要！）
   - Chrome: 设置 → 隐私和安全 → 清除浏览数据 → 缓存的图片和文件
   - Safari: 设置 → Safari → 清除历史记录与网站数据

2. **访问网站**
   ```
   http://192.168.0.54:3000
   ```

3. **检查连接状态**
   - 顶部应显示：✅ **已连接** (绿色)
   - 如果仍显示离线，按 F12 打开开发者工具查看网络请求

---

## 🐛 常见问题

### Q1: `git pull` 失败，提示有本地修改

```bash
# 查看修改的文件
git status

# 如果是 database.json，保存后重置
cp database.json database.json.backup
git checkout database.json

# 或者强制拉取
git fetch origin
git reset --hard origin/main
mv database.json.backup database.json
```

### Q2: 构建脚本失败

```powershell
# 检查 Node.js 版本
node --version  # 应该 >= 18

# 检查依赖
cd crypto-pwa
npm install

# 手动构建
npm run build
Copy-Item -Recurse -Force dist\* ..\crypto-backend\dist\
```

### Q3: Android 服务器启动失败

```bash
# 检查端口占用
netstat -tulnp | grep 3000

# 杀死占用端口的进程
kill -9 <PID>

# 检查日志
tail -f ~/CryptoPrice/crypto-backend/server.log
# 或
pm2 logs crypto-server
```

### Q4: 手机仍显示离线

1. **硬刷新浏览器**：Ctrl+Shift+R (电脑) 或长按刷新按钮 (手机)
2. **禁用 Service Worker**：
   - Chrome: chrome://serviceworker-internals
   - 找到 192.168.0.54:3000，点击 "Unregister"
3. **使用隐私/无痕模式**：测试是否缓存问题

---

## 📋 完整更新检查清单

- [ ] 电脑：`.env` 确认为空值
- [ ] 电脑：`build-and-deploy.ps1` 成功执行
- [ ] 电脑：`dist/` 文件已提交到 Git
- [ ] Android：`git pull` 成功拉取最新代码
- [ ] Android：`crypto-backend/dist/` 目录存在且包含文件
- [ ] Android：服务器已重启
- [ ] 验证：`http://192.168.0.54:3000/health` 返回 `{"healthy":true}`
- [ ] 验证：JS 文件不包含 `localhost:3000`
- [ ] 手机：浏览器缓存已清除
- [ ] 手机：访问 `http://192.168.0.54:3000` 显示"已连接"

---

## 🚀 自动化脚本（可选）

### 电脑端一键更新脚本

保存为 `update-android.ps1`：

```powershell
#!/usr/bin/env pwsh
Write-Host "🔨 重新构建前端..." -ForegroundColor Cyan
.\build-and-deploy.ps1

Write-Host "`n📦 提交到 Git..." -ForegroundColor Cyan
git add crypto-backend/dist
git commit -m "Update frontend build - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push origin main

Write-Host "`n✅ 更新完成！" -ForegroundColor Green
Write-Host "现在在 Android Termux 中执行：" -ForegroundColor Yellow
Write-Host "  cd ~/CryptoPrice && git pull && pm2 restart crypto-server" -ForegroundColor White
```

### Android 端一键更新脚本

保存为 `~/CryptoPrice/update.sh`：

```bash
#!/bin/bash
echo "🔄 拉取最新代码..."
git pull origin main

echo "🔄 重启服务器..."
pm2 restart crypto-server

echo "✅ 更新完成！"
pm2 status
```

使用：
```bash
chmod +x update.sh
./update.sh
```

---

## 📞 需要帮助？

如果问题仍然存在：

1. **收集日志**：
   ```bash
   # Android Termux
   pm2 logs crypto-server --lines 50
   ```

2. **网络测试**：
   ```powershell
   # 电脑
   Test-NetConnection -ComputerName 192.168.0.54 -Port 3000
   ```

3. **检查防火墙**：
   - Android 是否启用了防火墙应用？
   - 路由器是否启用了 AP 隔离？

4. **查看浏览器控制台**：
   - F12 → Network → 查看失败的请求
   - F12 → Console → 查看错误信息

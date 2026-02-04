# Android Termux 部署指南 / Android Deployment Guide

## 🚨 当前问题诊断

### 症状：其他客户端显示 "Offline mode: Backend offline"

**诊断结果：**
```
✅ Ping 成功 (192.168.0.54)
❌ 端口 3000 无法连接
```

这意味着：服务器未运行 或 端口被阻止

---

## 📱 在 Android Termux 中部署

### 步骤 1：检查服务器状态

```bash
# 检查 Node.js 进程是否运行
ps aux | grep node

# 检查端口 3000 是否被占用
netstat -tulnp | grep 3000
# 或者
lsof -i :3000
```

### 步骤 2：启动服务器

```bash
# 进入项目目录
cd ~/CryptoPrice/crypto-backend

# 拉取最新代码
git pull

# 启动服务器
node server.js
```

**预期输出：**
```
[DB] Initializing JSON database at: .../database.json
[DB] ✅ Database initialized successfully
[STATIC] 📁 Serving frontend from: .../dist
╔═══════════════════════════════════════════════════╗
║   Crypto Portfolio Backend - LAN Sync Ready   ║
╚═══════════════════════════════════════════════════╝
🚀 Server running on: http://0.0.0.0:3000
```

### 步骤 3：验证服务器运行

**从 Android 本机测试：**
```bash
# 安装 curl (如果没有)
pkg install curl

# 测试健康检查
curl http://localhost:3000/health

# 测试价格 API
curl http://localhost:3000/prices
```

**从其他设备测试：**
- 浏览器访问：`http://192.168.0.54:3000`
- 命令行测试：`curl http://192.168.0.54:3000/health`

---

## 🔒 Termux 防火墙/网络问题

### 问题：Termux 可能没有开放端口

Termux 运行在 Android 沙箱中，通常不需要特殊权限。但如果无法访问：

1. **确认监听地址：**
   - 代码中应该是 `0.0.0.0:3000`（监听所有接口）
   - 不要使用 `localhost` 或 `127.0.0.1`（只能本机访问）

2. **检查 Android 防火墙：**
   ```bash
   # 在 Termux 中查看网络接口
   ifconfig
   # 或
   ip addr show
   ```

3. **Android 系统设置：**
   - 设置 → 网络 → 防火墙/数据保护 → 确保 Termux 允许网络访问

---

## 🔧 使用 PM2 持久化运行（推荐）

### 安装 PM2

```bash
npm install -g pm2
```

### 启动服务器

```bash
cd ~/CryptoPrice/crypto-backend

# 启动并命名为 crypto-server
pm2 start server.js --name crypto-server

# 保存配置（重启后自动恢复）
pm2 save

# 设置开机自启（可选）
pm2 startup
```

### PM2 常用命令

```bash
# 查看状态
pm2 status
pm2 logs crypto-server

# 重启服务器
pm2 restart crypto-server

# 停止服务器
pm2 stop crypto-server

# 删除服务器
pm2 delete crypto-server

# 查看实时日志
pm2 logs crypto-server --lines 100
```

---

## 📋 完整部署检查清单

### ✅ 第一次部署

```bash
# 1. 安装依赖
cd ~/CryptoPrice/crypto-backend
npm install

# 2. 检查配置文件
ls -la
# 应该看到：server.js, db.js, fetcher.js, package.json, dist/

# 3. 启动服务器
node server.js

# 4. 新开一个 Termux 会话测试
curl http://localhost:3000/health
# 预期输出：{"healthy":true,"timestamp":...}
```

### ✅ 更新部署

```bash
# 1. 停止旧服务器
pm2 stop crypto-server
# 或者 Ctrl+C 停止

# 2. 拉取最新代码
cd ~/CryptoPrice/crypto-backend
git pull

# 3. 重新安装依赖（如果 package.json 有变化）
npm install

# 4. 启动服务器
pm2 restart crypto-server
# 或
node server.js
```

---

## 🐛 故障排除

### 问题 1：端口已被占用

```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

### 问题 2：Node.js 未安装

```bash
# 安装 Node.js
pkg install nodejs

# 验证版本
node --version
npm --version
```

### 问题 3：Git 拉取失败

```bash
# 检查 Git 状态
git status

# 丢弃本地更改
git reset --hard HEAD

# 强制拉取
git pull --force
```

### 问题 4：权限问题

```bash
# Termux 需要存储权限
termux-setup-storage

# 如果提示权限错误，检查文件权限
ls -la ~/CryptoPrice/crypto-backend
```

### 问题 5：数据库文件损坏

```bash
# 备份旧数据库
mv database.json database.json.backup

# 重启服务器会自动创建新的空数据库
node server.js
```

---

## 📡 验证部署成功

### 从电脑验证：

**PowerShell 命令：**
```powershell
# 测试连接
Test-NetConnection -ComputerName 192.168.0.54 -Port 3000

# 测试健康检查
Invoke-RestMethod -Uri "http://192.168.0.54:3000/health"

# 测试价格 API
Invoke-RestMethod -Uri "http://192.168.0.54:3000/prices"
```

**浏览器：**
- 访问：`http://192.168.0.54:3000`
- 检查顶部状态：应该显示"已连接"（绿色）

### 从手机验证：

1. 连接到同一 WiFi 网络
2. 打开浏览器
3. 访问：`http://192.168.0.54:3000`
4. 检查能否看到价格数据

---

## 🔄 持续运行方案

### 方案 1：使用 PM2（推荐）

```bash
pm2 start server.js --name crypto-server
pm2 save
pm2 startup  # 开机自启
```

### 方案 2：使用 Termux:Boot

```bash
# 安装 Termux:Boot
# 从 F-Droid 安装 Termux:Boot app

# 创建启动脚本
mkdir -p ~/.termux/boot
nano ~/.termux/boot/start-crypto-server.sh
```

脚本内容：
```bash
#!/data/data/com.termux/files/usr/bin/bash
cd ~/CryptoPrice/crypto-backend
node server.js > ~/crypto-server.log 2>&1 &
```

赋予执行权限：
```bash
chmod +x ~/.termux/boot/start-crypto-server.sh
```

### 方案 3：使用 screen/tmux

```bash
# 安装 tmux
pkg install tmux

# 创建新会话
tmux new -s crypto

# 启动服务器
cd ~/CryptoPrice/crypto-backend
node server.js

# 按 Ctrl+B 然后按 D 分离会话

# 重新连接
tmux attach -t crypto
```

---

## 🎯 快速参考

### 最常用命令

```bash
# 启动服务器
cd ~/CryptoPrice/crypto-backend && node server.js

# 使用 PM2 启动
pm2 start server.js --name crypto-server

# 查看日志
pm2 logs crypto-server

# 重启服务器
pm2 restart crypto-server

# 更新代码
cd ~/CryptoPrice/crypto-backend && git pull && pm2 restart crypto-server
```

### 急救命令

```bash
# 服务器无响应
pm2 restart crypto-server --update-env

# 完全重置
pm2 delete crypto-server
rm -f database.json
node server.js

# 检查 IP 地址
ifconfig | grep inet
```

---

## 📞 需要帮助？

如果问题仍未解决，请提供：

1. `pm2 logs crypto-server` 的输出
2. `curl http://localhost:3000/health` 的结果
3. Android 设备的 IP 地址 (`ifconfig`)
4. 错误信息截图

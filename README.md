# 🪙 CryptoPrice - Cryptocurrency Portfolio Tracker

A modern, self-hosted cryptocurrency portfolio tracking Progressive Web App (PWA) with automatic exchange balance import. Built for privacy-conscious users who want to manage their crypto assets without relying on third-party cloud services.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-25.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

---

## 📖 Introduction

**CryptoPrice** is a full-stack cryptocurrency portfolio management application designed to run on your own devices. Track your crypto assets, monitor prices in real-time, and automatically import balances from exchanges—all while maintaining complete privacy and control over your data.

### ✨ Key Features

🔒 **Self-Hosted & Private** - Your data stays on your devices, no third-party cloud services  
📱 **Progressive Web App (PWA)** - Install on mobile/desktop, works offline  
🔄 **Auto Exchange Import** - Automatically import balances from OKX (more exchanges coming soon)  
📊 **Real-Time Price Tracking** - Automatic price updates every 5 minutes from CoinGecko API  
💼 **Multi-Wallet Management** - Track assets across multiple wallets and exchanges  
📈 **Portfolio History** - Historical snapshots and performance tracking (30-day retention)  
🔐 **Server-First Architecture** - All data synced to backend for reliability  
🌍 **Multi-Language Support** - English and Chinese (i18n ready)  
🎨 **Dark/Light Theme** - Beautiful UI with Tailwind CSS  
🤖 **Android Termux Compatible** - Run the backend server on Android devices 24/7  
⚡ **Manual Refresh** - Instant balance refresh via API endpoint

---

## 🛠 Tech Stack

### Backend (`crypto-backend`)
- **Runtime**: Node.js v25.x (ES Modules)
- **Framework**: Express.js
- **Database**: JSON-based file storage
- **Exchange API**: CCXT (cryptocurrency exchange library)
- **Task Scheduling**: node-cron
- **Price Updates**: Every 5 minutes (configurable)
- **Exchange Import**: Every 30 seconds (configurable)
- **CORS**: Enabled for LAN access

### Frontend (`crypto-pwa`)
- **Framework**: React 19.x + TypeScript
- **Build Tool**: Vite
- **UI Library**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v7
- **Local Database**: Dexie.js (IndexedDB wrapper)
- **Charts**: Recharts
- **Icons**: Lucide React
- **i18n**: i18next
- **PWA**: Vite PWA Plugin (Workbox)

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v20.x or higher ([Download](https://nodejs.org/))
- **npm**: v10.x or higher (comes with Node.js)
- **Git**: For cloning the repository
- **Modern Browser**: Chrome, Firefox, Safari, or Edge (for PWA support)

### For Android Termux Deployment (Recommended)
- **Termux App**: Install from [F-Droid](https://f-droid.org/packages/com.termux/)
- **Termux packages**: `nodejs`, `git`, `openssh`, `pm2`
- **Network**: Ensure your Android device is on the same LAN as your PC

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/CryptoPriceTracker.git
cd CryptoPrice
```

### 2. Backend Setup

```bash
cd crypto-backend

# Install dependencies
npm install

# Start the backend server
npm start
```

The backend server will start on `http://localhost:3000` by default.

### 3. Frontend Setup (Development)

```bash
cd crypto-pwa

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 4. Production Deployment

```bash
# Build frontend
cd crypto-pwa
npm run build

# Copy to backend public directory
cd ..
cp -r crypto-pwa/dist/* crypto-backend/public/

# Backend automatically serves frontend
cd crypto-backend
npm start
```

Access the app at `http://localhost:3000`

---

## 🎯 Deploying to Android Termux

### Initial Setup on Android

```bash
# 1. Install packages
pkg update && pkg upgrade
pkg install nodejs git openssh

# 2. Clone repository
git clone https://github.com/YOUR_USERNAME/CryptoPriceTracker.git
cd CryptoPrice/crypto-backend

# 3. Install dependencies
npm install

# 4. Install PM2 for process management
npm install -g pm2

# 5. Start server with PM2
pm2 start server.js --name crypto-server

# 6. Enable auto-start on boot
pm2 save
pm2 startup
```

### Deploy Updates from PC (Windows)

Use the provided PowerShell deployment script:

```powershell
.\deploy.ps1
```

This script will:
1. Build the frontend
2. Copy files to `crypto-backend/public/`
3. Upload to Android via SCP
4. Restart the PM2 process

**Requirements**: SSH access to your Android device on the same LAN.

---

## ⚙️ Configuration

### Backend Configuration

The backend uses default settings suitable for most deployments. Optional `.env` file:

```bash
PORT=3000
FETCH_INTERVAL=5  # Price update interval in minutes
```

### Frontend Configuration (`crypto-pwa/.env`)

```bash
# Backend API URL (empty = same origin)
VITE_API_BASE_URL=http://192.168.0.54:3000  # Change to your Android IP

# Enable backend usage
VITE_USE_BACKEND=true

# Enable data sync
VITE_SYNC_ENABLED=true
```

---

## 📡 Exchange Integration

### Supported Exchanges
- ✅ **OKX** - Fully integrated (Trading + Funding accounts)
- 🔜 **Binance** - Coming soon
- 🔜 **Coinbase** - Coming soon
- 🔜 **Kraken** - Coming soon

### Adding OKX API Key

1. Visit [OKX API Settings](https://www.okx.com/account/my-api)
2. Create a new API key with **Read** permission only
3. Copy API Key, Secret Key, and Passphrase
4. In the app:
   - Click "Add Wallet"
   - Select "API Connection"
   - Choose "OKX"
   - Enter your credentials
   - Click "Save"

**Important**: 
- ⚠️ Use **Read-only** API keys for security
- 🔐 Keys are synced to backend for automatic import
- 🔄 Balances auto-import every 30 seconds
- ⚡ Manual refresh: `POST http://YOUR_IP:3000/api/exchange/import`

### Auto-Import Features

The backend automatically:
- Fetches balances from OKX every 30 seconds
- Creates wallet if not exists
- Updates asset quantities
- Merges trading + funding account balances
- Runs independently of frontend (no browser needed)

Manual refresh endpoint:
```bash
# PowerShell
Invoke-RestMethod -Uri "http://192.168.0.54:3000/api/exchange/import" -Method POST

# curl
curl -X POST http://192.168.0.54:3000/api/exchange/import
```

---

## 🌐 API Endpoints

### Health & Status
- `GET /status` - Server status and system info
- `GET /health` - Health check

### Cryptocurrency Prices
- `GET /prices` - Latest cryptocurrency prices (cached)
- `GET /prices/batch` - Batch price fetch
- `GET /coins` - List of tracked coins

### Portfolio Management
- `GET /api/wallets` - Get all wallets
- `POST /api/wallets` - Create wallet
- `PUT /api/wallets/:id` - Update wallet
- `DELETE /api/wallets/:id` - Delete wallet

### Assets
- `GET /api/assets` - Get all assets
- `POST /api/assets` - Create asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### Exchange Integration
- `GET /api/exchange/list` - List configured API keys (without exposing secrets)
- `POST /api/exchange/apikey` - Save exchange API key
- `DELETE /api/exchange/apikey/:exchange` - Delete API key
- `GET /api/exchange/:exchange/balance` - Fetch balance from exchange
- `POST /api/exchange/import` - **Manual refresh** - Immediately import all exchange balances

### Data Synchronization
- `GET /api/sync` - Get full sync state (wallets + assets)
- `POST /api/sync` - Replace full sync state

### Portfolio History
- `GET /api/portfolio-history` - Get historical portfolio snapshots (last 30 days)

---

## 📁 Project Structure

```
CryptoPrice/
├── crypto-backend/              # Backend Node.js server
│   ├── db.js                    # Database operations (JSON file-based)
│   ├── fetcher.js               # Price fetching logic (CoinGecko)
│   ├── server.js                # Express.js API server
│   ├── exchange-importer.js     # Auto-import exchange balances
│   ├── database.json            # JSON database (auto-generated)
│   ├── public/                  # Served frontend (after build)
│   └── package.json             # Backend dependencies
│
├── crypto-pwa/                  # Frontend PWA application
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components (Dashboard, Portfolio, Settings)
│   │   ├── hooks/               # Custom hooks (useAssets, usePrices, useExchangeSync)
│   │   ├── services/            # API services (priceService, syncService, exchangeService)
│   │   ├── db/                  # Dexie.js IndexedDB database
│   │   ├── store/               # Zustand state management (theme)
│   │   ├── i18n/                # Internationalization (en, zh)
│   │   └── App.tsx              # Main React component
│   ├── dist/                    # Build output (generated)
│   ├── vite.config.ts           # Vite configuration
│   └── package.json             # Frontend dependencies
│
├── test/                        # Test scripts and tools
│   ├── add-okx-api.ps1         # Script to add OKX API key
│   ├── test-auto-import.ps1    # Test auto-import functionality
│   ├── test-manual-refresh.ps1 # Test manual refresh
│   ├── test-backend-okx.js     # Backend OKX integration test
│   ├── test-portfolio-api.html # API testing interface
│   └── ...                     # Other test files
│
├── scripts/                     # Database management scripts
│   ├── clear-database.sh       # Full database wipe (with backup)
│   └── clear-wallets-assets.sh # Clear wallets/assets (keep API keys)
│
├── deploy.ps1                   # Windows deployment script to Termux
├── README.md                    # This file
└── .gitignore                   # Git ignore rules
```

### Key Files Explained

- **`exchange-importer.js`**: Background service that auto-imports exchange balances every 30 seconds
- **`useExchangeSync.ts`**: Frontend hook (no longer used - backend handles import)
- **`deploy.ps1`**: One-command deployment to Android Termux
- **`test/`**: All test scripts consolidated in one directory

---

## 🔧 Database Management

### Clear Database Scripts

Located in `scripts/` directory:

```bash
# Full database wipe (creates backup)
cd crypto-backend
bash ../scripts/clear-database.sh

# Clear only wallets and assets (keep API keys and price data)
bash ../scripts/clear-wallets-assets.sh
```

**PowerShell equivalent**:
```powershell
# SSH to Termux and run
ssh u0_a268@192.168.0.54 -p 8022 "cd ~/crypto-server/crypto-backend && bash ../scripts/clear-database.sh"
```

### Manual Database Backup

```bash
# On Android Termux
cd ~/crypto-server/crypto-backend
cp database.json "backups/database-$(date +%Y%m%d-%H%M%S).json"
```

---

## 🔐 Security Recommendations

### ⚠️ Important: API Keys and Sensitive Data

1. **Use read-only API keys**
   - Only create exchange API keys with **Read** permission
   - Never use keys with withdrawal or trading permissions

2. **Protect your backend server**
   - For LAN-only access, use firewall rules to block external access
   - Change default SSH port on Termux: `pkg install openssh && sshd -p 8022`

3. **Database file security**
   - `database.json` contains portfolio data and API keys (plain text)
   - Keep backups in a secure location
   - Consider encrypting backups

4. **Network security**
   - Backend listens on `0.0.0.0` for LAN access
   - Only accessible from local network (not internet)

---

## 🧪 Testing

All test scripts are located in the `test/` directory:

### PowerShell Tests (Windows)
```powershell
# Test manual refresh
.\test\test-manual-refresh.ps1

# Test auto-import
.\test\test-auto-import.ps1

# Add OKX API key
.\test\add-okx-api.ps1
```

### Node.js Tests
```bash
# Test backend OKX integration
cd test
node test-backend-okx.js
```

### HTML Test Interface
Open `test/test-portfolio-api.html` in a browser to test API endpoints interactively.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [CoinGecko API](https://www.coingecko.com/en/api) - Free cryptocurrency data API
- [CCXT](https://github.com/ccxt/ccxt) - Cryptocurrency exchange trading library
- [Vite](https://vitejs.dev/) - Next-generation frontend tooling
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper

---

## 🗺️ Roadmap

- [x] OKX exchange integration
- [x] Automatic balance import
- [x] Manual refresh endpoint
- [x] Android Termux deployment
- [x] Server-first architecture
- [x] Portfolio history tracking
- [ ] More exchanges (Binance, Coinbase, Kraken)
- [ ] DeFi protocol integrations
- [ ] NFT portfolio tracking
- [ ] Price alerts and notifications
- [ ] Desktop app (Electron wrapper)

---

**Made with ❤️ for the crypto community**

# 🪙 CryptoPrice - Cryptocurrency Portfolio Tracker

A modern, self-hosted cryptocurrency portfolio tracking Progressive Web App (PWA) with LAN synchronization support. Built for privacy-conscious users who want to manage their crypto assets without relying on third-party cloud services.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

---

## 📖 Introduction

**CryptoPrice** is a full-stack cryptocurrency portfolio management application designed to run on your own devices. Track your crypto assets, monitor prices in real-time, and sync data across devices on your local network—all while maintaining complete privacy and control over your data.

### Key Features

✨ **Self-Hosted & Private** - Your data stays on your devices, no third-party cloud services  
📱 **Progressive Web App (PWA)** - Install on mobile/desktop, works offline  
🔄 **LAN Synchronization** - Sync portfolio data across devices on your local network  
📊 **Real-Time Price Tracking** - Automatic price updates from CoinGecko API  
💼 **Multi-Wallet Management** - Track assets across multiple wallets and exchanges  
📈 **Portfolio History** - Historical snapshots and performance tracking  
🔐 **Encrypted API Keys** - Safely store exchange API credentials (encrypted locally)  
🌍 **Multi-Language Support** - English and Chinese (i18n ready)  
🎨 **Dark/Light Theme** - Beautiful UI with Tailwind CSS  
🤖 **Android Termux Compatible** - Run the backend server on Android devices

---

## 🛠 Tech Stack

### Backend (`crypto-backend`)
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: JSON-based file storage (with future SQLite support)
- **API Client**: Axios, CCXT (cryptocurrency exchange library)
- **Task Scheduling**: node-cron
- **CORS**: Enabled for LAN access

### Frontend (`crypto-pwa`)
- **Framework**: React 19.x + TypeScript
- **Build Tool**: Vite
- **UI Library**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v7
- **Database**: Dexie.js (IndexedDB wrapper)
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

### For Android Termux Deployment (Optional)
- **Termux App**: Install from [F-Droid](https://f-droid.org/packages/com.termux/)
- **Termux:Boot**: For auto-starting backend on device boot

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/CryptoPrice.git
cd CryptoPriceTracker
```

### 2. Backend Setup

```bash
cd crypto-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your preferred settings (optional)
# nano .env

# Start the backend server
npm start
```

The backend server will start on `http://localhost:3000` by default.

#### Development Mode (with auto-reload):
```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd crypto-pwa

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env if needed (see Configuration section below)
# nano .env

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173` (Vite default).

---

## ⚙️ Configuration

### Backend Configuration (`crypto-backend/.env`)

```bash
# Server Configuration
PORT=3000                           # Backend API server port

# CoinGecko API Configuration
COINGECKO_API_BASE=https://api.coingecko.com/api/v3

# Price Fetching
FETCH_INTERVAL=5                    # Fetch prices every N minutes (default: 5)

# Database
DB_PATH=./database.json             # JSON database file path

# Logging
LOG_LEVEL=info                      # Log level: debug, info, warn, error
```

**Important Notes:**
- CoinGecko free tier: 10-30 calls/minute. Use `FETCH_INTERVAL=5` or higher to avoid rate limits.
- Database file will be created automatically on first run.

### Frontend Configuration (`crypto-pwa/.env`)

```bash
# Backend API URL
VITE_API_BASE_URL=                  # Empty = use same origin (recommended)
                                    # Or: http://192.168.x.x:3000 for LAN access

# Backend Usage
VITE_USE_BACKEND=true               # true = use backend server
                                    # false = direct CoinGecko API calls

# Fallback Mode
VITE_FALLBACK_TO_COINGECKO=true     # true = fallback to CoinGecko if backend fails

# Data Synchronization
VITE_SYNC_ENABLED=true              # true = enable LAN sync
                                    # false = local-only storage
```

**Configuration Scenarios:**

| Scenario | `VITE_API_BASE_URL` | `VITE_SYNC_ENABLED` |
|----------|---------------------|---------------------|
| Local development (same machine) | `` (empty) | `true` or `false` |
| LAN access (backend on Android) | `http://192.168.x.x:3000` | `true` |
| Production (backend + frontend on same server) | `` (empty) | `true` |
| Standalone mode (no backend) | N/A | `false` |

---

## 🎯 Usage

### Running in Development Mode

**Terminal 1 - Backend:**
```bash
cd crypto-backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd crypto-pwa
npm run dev
```

Open your browser to `http://localhost:5173`

### Building for Production

**Frontend:**
```bash
cd crypto-pwa
npm run build
```

The production build will be created in `crypto-pwa/dist/`.

**Deployment Options:**

1. **Serve frontend build with backend:**
   ```bash
   # Copy built files to backend's public directory
   cp -r crypto-pwa/dist/* crypto-backend/public/
   
   # Backend will automatically serve frontend from /public
   cd crypto-backend
   npm start
   ```

2. **Deploy to static hosting:**
   - Upload `crypto-pwa/dist/` to services like Netlify, Vercel, GitHub Pages
   - Set `VITE_API_BASE_URL` to your backend server URL before building

3. **Use provided scripts:**
   ```bash
   # Windows PowerShell
   .\scripts\build-and-deploy.ps1
   
   # Linux/macOS
   ./scripts/build-and-deploy.sh
   ```

### Android Termux Deployment

See [docs/deployment/android.md](docs/deployment/android.md) for detailed Android deployment instructions.

**Quick start:**
```bash
# On Android Termux
pkg install nodejs git
git clone https://github.com/YOUR_USERNAME/CryptoPrice.git
cd CryptoPrice/crypto-backend
npm install
npm start
```

Keep server running in background:
```bash
termux-wake-lock
npm start > server.log 2>&1 &
```

---

## 📁 Project Structure

```
CryptoPrice/
├── crypto-backend/              # Backend Node.js server
│   ├── db.js                    # Database operations (JSON file-based)
│   ├── fetcher.js               # Price fetching logic (CoinGecko)
│   ├── server.js                # Express.js API server
│   ├── database.json            # JSON database (auto-generated)
│   ├── package.json             # Backend dependencies
│   └── .env.example             # Environment variables template
│
├── crypto-pwa/                  # Frontend PWA application
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page-level components (Dashboard, Portfolio, Settings)
│   │   ├── hooks/               # Custom React hooks (useAssets, usePrices, etc.)
│   │   ├── services/            # API services (priceService, syncService, etc.)
│   │   ├── db/                  # Dexie.js IndexedDB database
│   │   ├── store/               # Zustand state management
│   │   ├── i18n/                # Internationalization (English, Chinese)
│   │   └── App.tsx              # Main React component
│   ├── public/                  # Static assets
│   ├── index.html               # HTML entry point
│   ├── vite.config.ts           # Vite configuration
│   ├── package.json             # Frontend dependencies
│   └── .env.example             # Frontend environment variables template
│
├── docs/                        # Documentation
│   ├── deployment/              # Deployment guides (Android, production, etc.)
│   └── guides/                  # Technical guides (cache clearing, sync, etc.)
│
├── scripts/                     # Build and deployment scripts
│   ├── build-and-deploy.ps1    # Windows PowerShell build script
│   └── build-and-deploy.sh     # Linux/macOS build script
│
├── test/                        # Integration tests
│   ├── test-portfolio-api.html # API testing interface
│   └── test-portfolio-api.ps1  # API test script
│
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

### Key Directories Explained

- **`crypto-backend/`**: RESTful API server that fetches cryptocurrency prices from CoinGecko and manages portfolio data. Designed to run 24/7 on low-power devices (like Android phones via Termux).

- **`crypto-pwa/src/components/`**: Reusable UI components (modals, cards, charts, etc.)

- **`crypto-pwa/src/pages/`**: Top-level page components:
  - `Dashboard.tsx` - Overview with portfolio value and price charts
  - `Portfolio.tsx` - Manage wallets and assets
  - `Settings.tsx` - App configuration, API keys, language settings

- **`crypto-pwa/src/hooks/`**: Custom hooks for data management:
  - `usePrices.ts` - Fetch and cache cryptocurrency prices
  - `useAssets.ts` - Manage portfolio assets
  - `useSyncHydration.ts` - Sync data between devices

- **`crypto-pwa/src/services/`**: API and business logic:
  - `priceService.ts` - Price fetching (backend or CoinGecko)
  - `syncService.ts` - LAN sync coordination
  - `exchangeService.ts` - CCXT exchange integrations
  - `encryptionService.ts` - Encrypt/decrypt API keys

---

## 🔐 Security Recommendations

### ⚠️ Important: API Keys and Sensitive Data

This project is designed to store exchange API keys **encrypted locally** in your browser's IndexedDB. However, follow these best practices:

1. **Never commit `.env` files to Git**
   - `.env` files are already in `.gitignore`
   - Always use `.env.example` as a template

2. **Use read-only API keys**
   - When connecting to exchanges (Binance, Coinbase, etc.), create API keys with **read-only** permissions
   - Never use keys with withdrawal or trading permissions

3. **Protect your backend server**
   - If exposing backend to the internet, use HTTPS and add authentication
   - For LAN-only access, use firewall rules to block external access

4. **Database file security**
   - `database.json` contains your portfolio data and encrypted API keys
   - Keep backups in a secure location
   - File is excluded from Git via `.gitignore`

5. **Environment variables**
   - Do not hardcode secrets in source code
   - Always use environment variables for configuration
   - Check files before committing: `git diff` and review changes

### 🔍 Hardcoded Secrets Check

✅ **No hardcoded secrets detected** in the current codebase. All sensitive configurations are properly externalized to `.env` files.

---

## 🌐 API Endpoints

The backend server exposes the following RESTful API endpoints:

### Health & Status
- `GET /status` - Server status and system info
- `GET /health` - Health check

### Cryptocurrency Prices
- `GET /prices` - Latest cryptocurrency prices (cached)
- `GET /history/:coinId?limit=N` - Price history for a specific coin
- `GET /coins` - List of tracked coins

### Portfolio Management
- `GET /wallets` - Get all wallets
- `POST /wallets` - Create a new wallet
- `PUT /wallets/:id` - Update wallet
- `DELETE /wallets/:id` - Delete wallet

### Assets
- `GET /assets` - Get all assets
- `GET /assets/wallet/:walletId` - Get assets by wallet
- `POST /assets` - Create asset
- `PUT /assets/:id` - Update asset
- `DELETE /assets/:id` - Delete asset

### Data Synchronization
- `GET /sync` - Get full sync state (wallets + assets)
- `POST /sync` - Replace full sync state

### Portfolio History
- `GET /portfolio-history` - Get historical portfolio snapshots
- `POST /portfolio-history` - Create a new snapshot

See [crypto-backend/README.md](crypto-backend/README.md) for detailed API documentation.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style (TypeScript, ESLint)
- Write meaningful commit messages
- Test thoroughly before submitting PR
- Update documentation if adding new features

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/CryptoPrice/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/CryptoPrice/discussions)

---

## 🙏 Acknowledgments

- [CoinGecko API](https://www.coingecko.com/en/api) - Free cryptocurrency data API
- [CCXT](https://github.com/ccxt/ccxt) - Cryptocurrency exchange trading library
- [Vite](https://vitejs.dev/) - Next-generation frontend tooling
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper

---

## 🗺️ Roadmap

- [ ] Add more exchanges support (via CCXT)
- [ ] Implement DeFi protocol integrations (Uniswap, PancakeSwap)
- [ ] Add NFT portfolio tracking
- [ ] Implement tax reporting features
- [ ] Add price alerts and notifications
- [ ] Support for more fiat currencies
- [ ] Desktop app (Electron wrapper)
- [ ] Cloud backup option (encrypted)

---

**Made with ❤️ for the crypto community**

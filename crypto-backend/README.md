# Crypto Portfolio Backend Server

Lightweight Node.js backend optimized for Android Termux.

## Features
- **Rate Limit Shield**: Fetches prices from CoinGecko every 5 minutes
- **Historical Data**: SQLite-based price history for charts
- **Resilient**: Handles network failures gracefully
- **LAN Access**: CORS-enabled for PWA communication

## Installation

### On Android Termux
```bash
# Install Node.js (if not already installed)
pkg install nodejs

# Navigate to project directory
cd crypto-backend

# Install dependencies
npm install

# Start server
npm start
```

### Development Mode
```bash
npm run dev
```

## API Endpoints

### Phase 1: Server Status
- `GET /status` - Server status and system info
- `GET /health` - Health check

### Phase 2: Database
- `GET /prices` - Latest cryptocurrency prices (instant, cached)
- `GET /history/:coin?limit=N` - 7-day price history for specific coin
- `GET /db/stats` - Database statistics

### Phase 3: Fetcher (Current)
- `GET /coins` - List of tracked cryptocurrencies
- `POST /fetch/now` - Manually trigger price update

## Configuration
- **Port**: 3000 (default) or set `PORT` environment variable
- **CORS**: Allows all origins (configured for LAN access)
- **Fetch Interval**: 5 minutes (default) or set `FETCH_INTERVAL` env variable
- **Tracked Coins**: bitcoin, ethereum, crypto-com-chain, solana, binancecoin

## Features

### Automatic Price Updates
- Fetches prices from CoinGecko every 5 minutes
- Stores historical data for 7-day charts
- Resilient: retries on failure without crashing
- Initial fetch on server startup

### Data Storage
- SQLite database with WAL mode for concurrency
- Two tables: `price_history` (historical) and `latest_prices` (current)
- Automatic indexing for fast queries
- Supports 24h price change tracking

## Running on Termux

### Keep Server Running
```bash
# Install termux-wake-lock (prevents Android from killing the process)
termux-wake-lock

# Start server in background
npm start &
```

### Auto-start on Boot (Optional)
```bash
# Install Termux:Boot app from F-Droid
# Create boot script
mkdir -p ~/.termux/boot
echo "cd ~/crypto-backend && npm start" > ~/.termux/boot/start-server.sh
chmod +x ~/.termux/boot/start-server.sh
```

## Monitoring
```bash
# Check if server is running
curl http://localhost:3000/status

# View logs
# (if running in background, redirect output to file)
npm start > server.log 2>&1 &
tail -f server.log
```

## Project Structure
```
crypto-backend/
├── server.js           # Main Express server
├── package.json        # Dependencies
├── crypto.db          # SQLite database (created on first run)
└── README.md          # This file
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000
# Or on Termux
netstat -tulpn | grep :3000

# Kill the process
kill <PID>
```

### Cannot Install sqlite3
```bash
# Termux may require build tools
pkg install build-essential python
npm install
```

## Next Steps
- Phase 4: Enhanced REST API endpoints for PWA integration
- Add API rate limiting protection
- Implement data retention policies
- Add support for custom coin tracking

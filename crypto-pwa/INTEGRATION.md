# Frontend-Backend Integration Guide

## Overview
The PWA frontend now connects to your Android backend server for crypto price data, with smart fallback to CoinGecko if needed.

## Configuration

### 1. Environment Variables (.env)
The `.env` file in the root of `crypto-pwa/` contains:

```bash
# Backend API Configuration
VITE_API_BASE_URL=http://192.168.0.88:3000
VITE_USE_BACKEND=true
VITE_FALLBACK_TO_COINGECKO=true
```

**Important**: Replace `192.168.0.88` with your actual Android phone's IP address on your local network.

### 2. Find Your Android Phone's IP Address

#### On Android (Termux):
```bash
ifconfig wlan0 | grep "inet addr"
# or
ip addr show wlan0
```

#### On Windows (same network):
```powershell
# Ping your phone's hostname if known
ping PHONE_NAME

# Or scan network
arp -a
```

### 3. Configuration Options

- **VITE_API_BASE_URL**: Backend server URL (e.g., `http://192.168.0.100:3000`)
- **VITE_USE_BACKEND**: 
  - `true` = Use backend as primary source
  - `false` = Use CoinGecko directly
- **VITE_FALLBACK_TO_COINGECKO**: 
  - `true` = Fall back to CoinGecko if backend fails
  - `false` = Only use backend (no fallback)

## Architecture

### Request Flow
```
Frontend (PWA)
    ↓
1. Try Backend (if VITE_USE_BACKEND=true)
    ↓ (if fails and VITE_FALLBACK_TO_COINGECKO=true)
2. Try CoinGecko API
    ↓ (if fails)
3. Use Dexie Cache (offline)
```

### Data Mapping
Backend returns:
```json
{
  "success": true,
  "data": [
    {"coin_id": "bitcoin", "price_usd": 88907, "last_updated": 1769162783},
    {"coin_id": "ethereum", "price_usd": 2918.75, "last_updated": 1769162783}
  ]
}
```

Frontend converts to:
```javascript
Map {
  "BTC" => 88907,
  "ETH" => 2918.75
}
```

## Testing

### 1. Test Backend Connectivity
```bash
# From your dev machine, replace IP with actual Android IP
curl http://192.168.0.88:3000/prices
```

Expected response:
```json
{
  "success": true,
  "data": [
    {"coin_id": "bitcoin", "price_usd": 88907, "last_updated": 1769162783}
  ]
}
```

### 2. Test Frontend Integration
1. Update `.env` with correct Android IP
2. Start dev server:
```bash
npm run dev
```

3. Open browser console (F12) and check logs:
```
[priceService] Using backend for X symbols
[priceService] Backend returned X prices
```

4. Verify in Dashboard that prices are loading

### 3. Test Fallback
1. Stop backend server
2. Check console logs:
```
[priceService] Backend failed, falling back to CoinGecko
[priceService] Using CoinGecko for X symbols
```

## Troubleshooting

### Issue: "Failed to fetch" error
**Solution**: 
- Verify Android backend is running: `node server.js`
- Check IP address is correct in `.env`
- Ensure both devices on same network
- Check firewall/antivirus not blocking port 3000

### Issue: CORS errors
**Solution**: Backend already configured with CORS allowing all origins. Verify `cors()` middleware is enabled in `server.js`.

### Issue: Backend returns empty data
**Solution**: 
- Check backend database: `curl http://IP:3000/db/stats`
- Manually trigger fetch: `curl -X POST http://IP:3000/fetch/now`
- Wait for cron job (runs every 5 minutes)

### Issue: Prices not updating
**Solution**:
- Check browser console for errors
- Verify 5-minute refresh interval hasn't been hit yet
- Clear IndexedDB cache (DevTools → Application → IndexedDB)
- Hard refresh: Ctrl+Shift+R

## Code Changes Summary

### Modified Files
1. **crypto-pwa/.env** (new)
   - Backend configuration

2. **crypto-pwa/src/services/priceService.ts**
   - Added backend configuration constants
   - Added `ID_TO_SYMBOL_MAP` for response mapping
   - Added `BackendPriceResponse` interface
   - Added `fetchPricesFromBackend()` method
   - Renamed `fetchBatchPricesFromAPI()` to `fetchBatchPricesFromCoinGecko()`
   - Updated main `fetchBatchPricesFromAPI()` with smart fallback logic

### No Changes Required
- ✅ Dashboard UI (unchanged)
- ✅ Portfolio UI (unchanged)
- ✅ Settings UI (unchanged)
- ✅ Bottom Navigation (unchanged)
- ✅ All other components (unchanged)

## Network Configuration

### Development (Windows + Android on LAN)
```
Windows Dev Machine: 192.168.0.X
    ↓ (HTTP)
Android Phone: 192.168.0.88:3000
```

### Production (Android Self-Contained)
Option 1: Use `localhost` (phone accesses its own backend)
```env
VITE_API_BASE_URL=http://localhost:3000
```

Option 2: Keep LAN IP for remote access from other devices
```env
VITE_API_BASE_URL=http://192.168.0.88:3000
```

## Performance Notes

- Backend caches prices in SQLite (persistent across restarts)
- Frontend caches in IndexedDB (offline support)
- Backend refreshes every 5 minutes via cron
- Frontend respects 5-minute refresh slots (avoids excessive requests)
- Rate limit protection on both backend and frontend

## Next Steps

1. **Update .env with real IP**: Replace `192.168.0.88` with actual Android phone IP
2. **Start Backend**: Run `node server.js` on Android (Termux)
3. **Start Frontend**: Run `npm run dev` on dev machine
4. **Test Integration**: Open app, verify prices load in Dashboard
5. **Monitor Logs**: Check both backend console and browser console for errors

## Maintenance

- Backend logs to console (stdout)
- Frontend logs to browser console
- Database stats available at: `GET /db/stats`
- Manual price update: `POST /fetch/now`
- Health check: `GET /health`

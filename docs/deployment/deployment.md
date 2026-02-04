# Deployment Guide

## Quick Deploy (Local Testing)

From project root on Windows:
```powershell
.\build-and-deploy.ps1
```

## Environment Configuration

Before building, update `crypto-pwa/.env`:

### Option 1: Use Relative URLs (Recommended)
```env
# Leave empty - API calls will use same origin
VITE_API_BASE_URL=

# Other settings
VITE_USE_BACKEND=true
VITE_SYNC_ENABLED=true
VITE_FALLBACK_TO_COINGECKO=true
```

### Option 2: Use Absolute URL
```env
# Replace with your Android IP
VITE_API_BASE_URL=http://192.168.0.88:3000

# Other settings
VITE_USE_BACKEND=true
VITE_SYNC_ENABLED=true
VITE_FALLBACK_TO_COINGECKO=true
```

## Full Deployment Workflow

### On Windows PC:

1. **Build frontend:**
   ```powershell
   .\build-and-deploy.ps1
   ```

2. **Commit changes:**
   ```powershell
   git add .
   git commit -m "Deploy frontend to backend"
   git push
   ```

### On Android (Termux):

1. **Pull changes:**
   ```bash
   cd ~/CryptoPrice/crypto-backend
   git pull
   ```

2. **Start server:**
   ```bash
   node server.js
   ```

3. **Find your IP:**
   ```bash
   ifconfig wlan0 | grep "inet addr"
   ```

4. **Access app:**
   - From Android: http://localhost:3000
   - From PC: http://192.168.0.XX:3000
   - From Phone: http://192.168.0.XX:3000

## What Gets Deployed

- ✅ React PWA (compiled)
- ✅ All assets (CSS, JS, images)
- ✅ Service Worker (offline support)
- ✅ Backend API endpoints

## Endpoints

- **Frontend:** `http://IP:3000/` (Dashboard, Portfolio, Settings)
- **API Sync:** `http://IP:3000/api/sync`
- **Prices:** `http://IP:3000/prices`
- **Status:** `http://IP:3000/status`

## Troubleshooting

### Frontend shows blank page
- Check browser console for errors
- Verify `dist` folder exists in `crypto-backend/`
- Check server logs for static file serving messages

### API calls fail
- Verify `VITE_API_BASE_URL` in `.env`
- Check CORS is enabled (already configured)
- Check network connectivity

### Routing doesn't work
- Server should have catch-all route (already added)
- Check browser console for 404 errors

## Development vs Production

**Development (separate servers):**
- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:3000 (Express server)
- CORS enabled, hot reload

**Production (single server):**
- Everything: http://ANDROID_IP:3000
- No CORS issues (same origin)
- Static files served by Express

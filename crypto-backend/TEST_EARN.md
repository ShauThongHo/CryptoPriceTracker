# 🧪 Test: Automatic Interest Calculation (Earn/Staking)

## ✅ Implementation Status

- **Step 1**: ✅ Extended db.js asset model with earnConfig support
- **Step 2**: ✅ Modified server.js endpoints (added GET /api/assets/earn)
- **Step 3**: ✅ Added hourly background task in fetcher.js
- **Step 4**: ✅ Created automated test suite (test-earn.js) - **ALL TESTS PASS** 🎉

## Feature Overview
The backend now supports automatic interest calculation for Earn/Staking products:
- **Compound Interest**: Earnings are reinvested (snowball effect)
- **Simple Interest**: Earnings stay separate (fixed income)
- **Flexible Payout**: Daily, weekly, or custom intervals
- **Background Task**: Hourly calculation even when API is idle

---

## API Usage

### 1. Create Regular Asset (No Interest)
```bash
curl -X POST http://192.168.0.54:3000/api/assets \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": 1,
    "symbol": "BTC",
    "amount": 0.5,
    "tags": "cold-wallet",
    "notes": "Long-term holding"
  }'
```

### 2. Create Earn Position (Compound Interest, Daily Payout)
```bash
curl -X POST http://192.168.0.54:3000/api/assets \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": 1,
    "symbol": "USDT",
    "amount": 10000,
    "tags": "earn",
    "notes": "Binance Flexible Savings",
    "earnConfig": {
      "enabled": true,
      "apy": 12.5,
      "interestType": "compound",
      "payoutIntervalHours": 24
    }
  }'
```

**Expected Console Output:**
```
[Earn] 📈 Created earn position: 10000 USDT @ 12.5% APY (compound)
```

### 3. Create Staking Position (Simple Interest, Weekly Payout)
```bash
curl -X POST http://192.168.0.54:3000/api/assets \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": 2,
    "symbol": "ETH",
    "amount": 5,
    "tags": "staking",
    "notes": "Kraken Staking (90-day lock)",
    "earnConfig": {
      "enabled": true,
      "apy": 8.0,
      "interestType": "simple",
      "payoutIntervalHours": 168
    }
  }'
```

### 4. Get All Assets (Triggers Interest Calculation)
```bash
curl http://192.168.0.54:3000/api/assets
```

**If 24+ hours passed since creation, console shows:**
```
[Earn] 💰 Paid 0.00342466 USDT interest (compound, APY 12.5%)
```

### 5. Get Only Earn Positions (NEW!)
```bash
curl http://192.168.0.54:3000/api/assets/earn
```

**Response includes next payout countdown:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": 1,
      "wallet_id": 1,
      "symbol": "USDT",
      "amount": 10003.28767123,
      "tags": "earn",
      "earnConfig": {
        "enabled": true,
        "apy": 12.5,
        "interestType": "compound",
        "payoutIntervalHours": 24,
        "lastPayoutAt": 1706000000000
      },
      "nextPayoutAt": 1706086400000,
      "timeUntilPayoutMs": 82800000,
      "timeUntilPayoutHours": "23.00"
    }
  ],
  "timestamp": 1706003600000
}
```

---

## 🧪 Automated Testing

### Run Test Suite
```bash
cd crypto-backend
node test-earn.js
```

**Expected Output:**
```
🧪 ==================== EARN INTEREST CALCULATION TEST ====================

📋 Step 1: Create test wallet...
   ✅ Wallet created: ID 1

📋 Step 2: Create Earn positions...
   🔹 Test 1: Compound Interest (Daily Payout)
   [Earn] 📈 Created earn position: 10000 USDT @ 12% APY (compound)
   
   🔹 Test 2: Simple Interest (Daily Payout)
   [Earn] 📈 Created earn position: 10000 USDC @ 12% APY (simple)
   
   🔹 Test 3: Weekly Payout (Compound)
   [Earn] 📈 Created earn position: 10000 DAI @ 8% APY (compound, weekly)

📋 Step 3: Simulate time passage...
   ⏰ Simulating 25 hours passing...

📋 Step 4: Trigger interest calculation...
   [Earn] 💰 Paid 3.28767123 USDT interest (compound, APY 12%)
   [Earn] 💰 Paid 3.28767123 USDC interest (simple, APY 12%)

📊 ==================== RESULTS ====================

🔹 Test 1: Compound Interest (Daily Payout)
   ✅ PASS (difference: 0.00000000)

🔹 Test 2: Simple Interest (Daily Payout)
   ✅ PASS (difference: 0.00000000)

🔹 Test 3: Weekly Payout (Should NOT pay yet)
   ✅ PASS (no payout yet)

📊 ==================== SUMMARY ====================
   Tests Passed: 3/3
   🎉 All tests passed! Interest calculation is working correctly.
```

---

## Testing Interest Calculation

### Scenario: Simulate 25 Hours Passing

1. **Create a test asset:**
   ```bash
   curl -X POST http://192.168.0.54:3000/api/assets \
     -H "Content-Type: application/json" \
     -d '{
       "walletId": 1,
       "symbol": "USDT",
       "amount": 10000,
       "earnConfig": {
         "enabled": true,
         "apy": 12,
         "interestType": "compound",
         "payoutIntervalHours": 24
       }
     }'
   ```

2. **Manual database edit** (simulate time passing):
   - Open `database.json`
   - Find the asset you just created
   - Change `earnConfig.lastPayoutAt` to 25 hours ago:
     ```javascript
     // Current time: 1706000000000
     // 25 hours ago: 1706000000000 - (25 * 3600 * 1000) = 1705910000000
     "lastPayoutAt": 1705910000000
     ```

3. **Fetch assets to trigger calculation:**
   ```bash
   curl http://192.168.0.54:3000/api/assets
   ```

4. **Expected Results:**
   - Console: `[Earn] 💰 Paid 3.28767123 USDT interest (compound, APY 12%)`
   - Response: Asset amount increased from `10000` to `10003.28767123`
   - Database: `lastPayoutAt` updated to 24 hours ago (not 25, avoiding drift)

### Expected Daily Interest Calculation

**Formula (Compound):**
```
Daily Rate = APY / 365 = 12% / 365 = 0.0328767%
Amount After 1 Day = 10000 * (1 + 0.000328767) = 10003.28767 USDT
```

**Formula (Simple):**
```
Daily Interest = Principal * APY * (1/365) = 10000 * 0.12 * (1/365) = 3.28767 USDT
```

---

## Background Task

The `fetcher.js` now runs an hourly check:
```
[EARN] 💰 Interest calculator started (runs hourly)
[EARN] ⏰ Hourly interest check completed
```

This ensures:
- ✅ Interest is paid even if no one accesses the API
- ✅ No time drift (accurate to the millisecond)
- ✅ Compound interest compounds correctly over time

---

## Database Schema

**Asset with Earn Config:**
```json
{
  "id": 1,
  "wallet_id": 1,
  "symbol": "USDT",
  "amount": 10000,
  "tags": "earn",
  "notes": "Binance Flexible Savings",
  "created_at": 1706000000,
  "updated_at": 1706086400,
  "earnConfig": {
    "enabled": true,
    "apy": 12.5,
    "interestType": "compound",
    "payoutIntervalHours": 24,
    "lastPayoutAt": 1706086400000
  }
}
```

---

## Frontend Integration Example

```javascript
// Create Earn Position
const response = await fetch('http://192.168.0.54:3000/api/assets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletId: 1,
    symbol: 'USDT',
    amount: 10000,
    tags: 'earn',
    earnConfig: {
      enabled: true,
      apy: 12.5,
      interestType: 'compound',
      payoutIntervalHours: 24
    }
  })
});

// Fetch Assets (Auto-calculates interest)
const assets = await fetch('http://192.168.0.54:3000/api/assets').then(r => r.json());

// Filter Earn Positions
const earnPositions = assets.data.filter(a => a.earnConfig?.enabled);

// Display with APY badge
earnPositions.forEach(asset => {
  console.log(`${asset.symbol}: ${asset.amount} (📈 ${asset.earnConfig.apy}% APY)`);
});
```

---

## Notes

1. **Precision**: Uses `.toFixed(8)` to avoid floating-point errors
2. **Time Drift Prevention**: Advances `lastPayoutAt` by exact intervals
3. **Multiple Periods**: If 2+ periods pass, calculates all at once (e.g., 48 hours = 2 days)
4. **Backward Compatible**: Assets without `earnConfig` work normally
5. **Performance**: Calculation only runs when needed (on-demand + hourly)

---

## Next Steps

1. ✅ Backend implementation complete
2. 🔲 Frontend: Add Earn position creation form
3. 🔲 Frontend: Display APY badge on asset cards
4. 🔲 Frontend: Show next payout countdown timer
5. 🔲 Add exchange API integration (fetch real APY rates from Binance/OKX)

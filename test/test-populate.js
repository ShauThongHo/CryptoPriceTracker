import { getDatabase, insertPriceHistory, upsertLatestPrice, getDatabaseStats } from './db.js';

/**
 * Test script to populate database with sample data
 */
function populateSampleData() {
  console.log('🧪 Populating database with sample data...\n');
  
  const coins = ['bitcoin', 'ethereum', 'crypto-com-chain', 'solana', 'binancecoin'];
  const samplePrices = {
    'bitcoin': 42000,
    'ethereum': 2800,
    'crypto-com-chain': 0.12,
    'solana': 95,
    'binancecoin': 320
  };
  
  // Insert historical data (simulate 24 hours of 5-minute intervals)
  const now = Math.floor(Date.now() / 1000);
  const fiveMinutes = 5 * 60;
  const recordsPerDay = (24 * 60) / 5; // 288 records per day
  
  let totalInserted = 0;
  
  coins.forEach(coin => {
    const basePrice = samplePrices[coin];
    console.log(`\n📊 ${coin}: Base price $${basePrice}`);
    
    for (let i = recordsPerDay; i >= 0; i--) {
      const timestamp = now - (i * fiveMinutes);
      // Simulate price fluctuation (±5%)
      const fluctuation = (Math.random() - 0.5) * 0.1; // -5% to +5%
      const price = basePrice * (1 + fluctuation);
      
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO price_history (timestamp, coin_id, price_usd, data_json)
        VALUES (?, ?, ?, ?)
      `);
      
      try {
        stmt.run(timestamp, coin, price, null);
        totalInserted++;
        
        if (i % 50 === 0) {
          process.stdout.write('.');
        }
      } catch (error) {
        // Ignore duplicate errors
      }
    }
    
    // Update latest price
    const latestPrice = samplePrices[coin] * (1 + (Math.random() - 0.5) * 0.1);
    upsertLatestPrice(coin, latestPrice);
    console.log(` ✅ Latest: $${latestPrice.toFixed(2)}`);
  });
  
  console.log(`\n\n✅ Inserted ${totalInserted} historical records\n`);
  
  // Show stats
  const stats = getDatabaseStats();
  console.log('📈 Database Statistics:');
  console.log(`   - History records: ${stats.historyRecords}`);
  console.log(`   - Latest prices: ${stats.latestPricesCount}`);
  console.log(`   - Oldest record: ${new Date(stats.oldestTimestamp * 1000).toLocaleString()}`);
  console.log(`   - Newest record: ${new Date(stats.newestTimestamp * 1000).toLocaleString()}`);
  console.log('\n🎉 Sample data population complete!');
}

export { populateSampleData };

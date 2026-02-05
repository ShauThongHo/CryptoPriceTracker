import { initDatabase } from './db.js';
import { populateSampleData } from './test-populate.js';

// Initialize database
initDatabase();

// Populate sample data
populateSampleData();

// Close after 1 second to allow all writes to complete
setTimeout(() => {
  console.log('\n👋 Test complete, exiting...');
  process.exit(0);
}, 1000);

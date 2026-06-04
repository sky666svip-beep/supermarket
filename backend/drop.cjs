const Database = require('better-sqlite3');
const db = new Database('./data/supermarket.db');

try {
  // Find all tables that start with '__new_'
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '__new_%'`).all();
  
  if (tables.length === 0) {
    console.log('No temporary tables found.');
  } else {
    tables.forEach(t => {
      db.exec(`DROP TABLE \`${t.name}\``);
      console.log(`Dropped table: ${t.name}`);
    });
    console.log('All temporary tables cleaned up.');
  }
} catch (e) {
  console.error('Error:', e);
}

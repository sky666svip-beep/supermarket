const fs = require('fs');
let content = fs.readFileSync('scripts/seed_parking.ts', 'utf8');
content = content.replace(/:\s*'([0-9.]+)'/g, ': $1');
fs.writeFileSync('scripts/seed_parking.ts', content);

const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');
code = code.replace(/integer\('([^']+)', \{ mode: 'timestamp' \}\)/g, "sqliteTimestamp('$1')");
code = code.replace(
  "import { sqliteTable, text, integer, real, index, uniqueIndex, check, AnySQLiteColumn } from 'drizzle-orm/sqlite-core'",
  "import { sqliteTable, text, integer, real, index, uniqueIndex, check, AnySQLiteColumn, customType } from 'drizzle-orm/sqlite-core'\n\nexport const sqliteTimestamp = customType({\n  dataType() { return 'integer'; },\n  fromDriver(value) { return new Date(typeof value === 'string' ? value.replace(' ', 'T') + 'Z' : value); },\n  toDriver(value) { return value ? value.toISOString().replace('T', ' ').replace('Z', '') : null; }\n});"
);
fs.writeFileSync('src/db/schema.ts', code);

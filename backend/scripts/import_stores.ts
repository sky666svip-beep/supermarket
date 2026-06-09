import fs from 'fs'
import path from 'path'
import { db } from '../src/db/index.js'
import { stores } from '../src/db/schema.js'
import { sql } from 'drizzle-orm'

async function importCsv(filePath: string, filename: string) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').map(l => l.trim()).filter(l => l)
  
  const baseName = filename.replace('.csv', '')
  let city = baseName
  let district = '全区'
  
  if (baseName.includes('市') && baseName.indexOf('市') !== baseName.length - 1) {
    const idx = baseName.indexOf('市') + 1
    city = baseName.substring(0, idx)
    district = baseName.substring(idx)
  }
  
  const jiangsuCities = ['镇江市', '苏州市', '无锡市', '扬州市']
  let province = '河南省'
  if (jiangsuCities.includes(city)) {
    province = '江苏省'
  }
  
  // skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const parts = line.split(',')
    if (parts.length < 3) continue
    
    const name = parts[0].trim()
    const timeAndLocation = parts[1].trim()
    const phone = parts.slice(2).join(',').trim().replace(/电话[:：]\s*/g, '')
    
    let time = timeAndLocation
    let location = timeAndLocation
    
    const match = timeAndLocation.match(/(.*?)地址[：:](.*)/)
    if (match) {
      time = match[1].trim()
      location = match[2].trim()
    }
    
    await db.insert(stores).values({
      name,
      province,
      city,
      district,
      location,
      time,
      phone,
      category: district
    })
    console.log(`Inserted: ${name} (${city}-${district})`)
  }
}

async function main() {
  const dataDir = path.join(process.cwd(), 'data', '店铺信息')
  
  // Clear existing stores to avoid duplication if run multiple times
  db.run(sql`PRAGMA foreign_keys = OFF;`);
  await db.delete(stores);
  try {
    db.run(sql`DELETE FROM sqlite_sequence WHERE name='stores';`);
  } catch (e) {
    // Catch in case table doesn't have sequence yet
  }
  db.run(sql`PRAGMA foreign_keys = ON;`);
  console.log('Cleared existing stores.')
  
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'))
    for (const file of files) {
      await importCsv(path.join(dataDir, file), file)
    }
  } else {
    console.log('Directory not found:', dataDir)
  }
  
  console.log('Import complete!')
  
  // Notify running server to clear caches (if server is running)
  try {
    const res = await fetch('http://localhost:3000/api/internal/clear-cache', { method: 'POST' })
    if (res.ok) {
      console.log('Server cache invalidated successfully.')
    } else {
      console.log('Failed to invalidate server cache: API returned non-OK status.')
    }
  } catch (err) {
    console.log('Server cache invalidation skipped (server might not be running locally).')
  }
  process.exit(0)
}

main().catch(console.error)

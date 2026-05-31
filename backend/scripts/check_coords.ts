import { db } from '../src/db/index.js'
import { stores } from '../src/db/schema.js'
import { eq, and } from 'drizzle-orm'

async function main() {
  const result = await db.select({
    id: stores.id,
    name: stores.name,
    latitude: stores.latitude,
    longitude: stores.longitude,
  }).from(stores).where(and(eq(stores.city, '郑州市'), eq(stores.district, '金水区')))
  console.log(JSON.stringify(result, null, 2))
  console.log(`\n金水区门店: ${result.length}, 有坐标: ${result.filter(s => s.latitude).length}`)
}

main()

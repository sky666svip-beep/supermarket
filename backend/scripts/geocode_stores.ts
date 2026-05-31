import { db } from '../src/db/index.js'
import { stores } from '../src/db/schema.js'
import { eq, isNull } from 'drizzle-orm'

// Tencent API Key from frontend env
const TENCENT_KEY = '54VBZ-QAVLH-5GZDA-WXICR-6GU4Q-URF32'

async function geocodeAddress(address: string, city: string): Promise<{ lat: string; lng: string } | null> {
  const url = `https://apis.map.qq.com/ws/geocoder/v1/?address=${encodeURIComponent(address)}&key=${TENCENT_KEY}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.status === 0 && data.result) {
      const location = data.result.location
      return { lat: location.lat.toString(), lng: location.lng.toString() }
    }
  } catch (error) {
    console.error(`Geocoding failed for ${address}:`, error)
  }
  return null
}

async function main() {
  const allStores = await db.select().from(stores)
  let updatedCount = 0

  for (const store of allStores) {
    if (store.latitude && store.longitude) continue // skip if already geocoded

    const address = store.location
    const city = store.city || ''
    
    // Some basic sanitization
    // Amap geocoding performs better if we provide specific address
    const fullAddress = `${store.province || ''}${city}${store.district || ''}${address}`

    console.log(`Geocoding ${store.name}... (${fullAddress})`)
    const coords = await geocodeAddress(fullAddress, city)
    
    if (coords) {
      await db.update(stores)
        .set({ latitude: coords.lat, longitude: coords.lng })
        .where(eq(stores.id, store.id))
      console.log(` -> Success: ${coords.lng}, ${coords.lat}`)
      updatedCount++
    } else {
      console.log(` -> Failed to geocode`)
    }
    
    // sleep slightly to prevent rate limit
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  console.log(`Geocoding finished. Updated ${updatedCount} stores.`)
  process.exit(0)
}

main().catch(console.error)

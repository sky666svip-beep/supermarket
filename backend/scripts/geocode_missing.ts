import { db } from '../src/db/index.js'
import { stores } from '../src/db/schema.js'
import { isNull } from 'drizzle-orm'

const TENCENT_KEY = '54VBZ-QAVLH-5GZDA-WXICR-6GU4Q-URF32'

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://apis.map.qq.com/ws/geocoder/v1/?address=${encodeURIComponent(address)}&key=${TENCENT_KEY}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.status === 0 && data.result?.location) {
      return data.result.location
    }
    console.warn(`  解析失败: ${data.message || '未知'}`)
    return null
  } catch (e) {
    console.error(`  请求异常:`, e)
    return null
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  // 查出所有缺坐标的门店
  const missing = await db.select().from(stores).where(isNull(stores.latitude))
  console.log(`共 ${missing.length} 家门店缺少坐标，开始补全...\n`)

  let success = 0
  let fail = 0

  for (const store of missing) {
    // 拼完整地址：省+市+区+详细地址
    const fullAddress = `${store.province || ''}${store.city || ''}${store.district || ''}${store.location}`
    console.log(`[${store.id}] ${store.name} -> ${fullAddress}`)

    const loc = await geocode(fullAddress)
    if (loc) {
      await db.update(stores).set({
        latitude: loc.lat,
        longitude: loc.lng,
      }).where(isNull(stores.latitude))
        .execute()
      
      // 更精确的更新 - 用 id
      const { eq } = await import('drizzle-orm')
      await db.update(stores).set({
        latitude: loc.lat,
        longitude: loc.lng,
      }).where(eq(stores.id, store.id))
      
      console.log(`  ✓ ${loc.lat}, ${loc.lng}`)
      success++
    } else {
      console.log(`  ✗ 无法解析`)
      fail++
    }

    // 腾讯限制 5次/秒
    await sleep(250)
  }

  console.log(`\n完成! 成功: ${success}, 失败: ${fail}`)
}

main()

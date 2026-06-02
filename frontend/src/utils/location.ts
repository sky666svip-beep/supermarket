// 模块：地理位置服务封装 (腾讯、高德、原生 API 降级)
import { jsonp } from './jsonp'
import { showToast } from 'vant'

export interface LocationInfo {
  province?: string
  city: string
  district?: string
  source?: string
  lat?: number
  lng?: number
}

interface CachedLocation {
  info: LocationInfo
  timestamp: number
}

const amapKey = import.meta.env.VITE_AMAP_KEY
const amapWebKey = import.meta.env.VITE_AMAP_WEB_KEY || amapKey
const tencentKey = import.meta.env.VITE_TENCENT_MAP_KEY
const baiduKey = import.meta.env.VITE_BAIDU_MAP_KEY

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Coordinate system conversions (WGS84 / BD09 -> GCJ02)
const PI = 3.1415926535897932384626
const a = 6378245.0
const ee = 0.00669342162296594323

const transformLat = (x: number, y: number) => {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0
  return ret
}

const transformLng = (x: number, y: number) => {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0
  return ret
}

const outOfChina = (lat: number, lng: number) => {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

const wgs84togcj02 = (lat: number, lng: number) => {
  if (outOfChina(lat, lng)) return [lat, lng]
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  let radLat = lat / 180.0 * PI
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  let sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI)
  return [lat + dLat, lng + dLng]
}

const bd09togcj02 = (bd_lat: number, bd_lon: number) => {
  const x_pi = 3.14159265358979324 * 3000.0 / 180.0
  const x = bd_lon - 0.0065
  const y = bd_lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi)
  const gg_lng = z * Math.cos(theta)
  const gg_lat = z * Math.sin(theta)
  return [gg_lat, gg_lng]
}

const getAmapIpLocation = async (): Promise<LocationInfo> => {
  const res = await fetch(`https://restapi.amap.com/v3/ip?key=${amapWebKey}`)
  const data = await res.json()
  if (data.status === '1' && data.city && typeof data.city === 'string') {
    // 高德 IP 定位不返回坐标，尝试用腾讯补充经纬度
    let lat: number | undefined
    let lng: number | undefined
    try {
      const tencentData = await jsonp('https://apis.map.qq.com/ws/location/v1/ip', { key: tencentKey, output: 'jsonp' })
      if (tencentData.status === 0 && tencentData.result?.location) {
        lat = tencentData.result.location.lat
        lng = tencentData.result.location.lng
      }
    } catch (_) {}
    return {
      province: data.province,
      city: data.city,
      district: '',
      source: 'amap-ip',
      lat,
      lng
    }
  }
  throw new Error(`Amap IP location API error: ${JSON.stringify(data)}`)
}

const getTencentIpLocation = async (): Promise<LocationInfo> => {
  const data = await jsonp('https://apis.map.qq.com/ws/location/v1/ip', { key: tencentKey, output: 'jsonp' })
  if (data.status === 0 && data.result) {
    const ad_info = data.result.ad_info
    const location = data.result.location
    return {
      province: ad_info.province,
      city: ad_info.city,
      district: ad_info.district,
      source: 'tencent-ip',
      lat: location?.lat,
      lng: location?.lng
    }
  }
  throw new Error(`Tencent IP location API error: ${JSON.stringify(data)}`)
}

const getBaiduIpLocation = async (): Promise<LocationInfo> => {
  const data = await jsonp('https://api.map.baidu.com/location/ip', { ak: baiduKey, coor: 'bd09ll' })
  if (data.status === 0 && data.content) {
    const detail = data.content.address_detail
    const point = data.content.point
    let lat: number | undefined
    let lng: number | undefined
    if (point?.y && point?.x) {
      // BD09 to GCJ02
      const [glat, glng] = bd09togcj02(parseFloat(point.y), parseFloat(point.x))
      lat = glat
      lng = glng
    }
    return {
      province: detail.province,
      city: detail.city,
      district: detail.district,
      source: 'baidu-ip',
      lat,
      lng
    }
  }
  throw new Error(`Baidu IP location API error: ${JSON.stringify(data)}`)
}

// lat, lng are expected to be GCJ02
const getAmapRegeo = async (lat: number, lng: number): Promise<LocationInfo> => {
  const res = await fetch(`https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${amapWebKey}`)
  const data = await res.json()
  if (data.status === '1' && data.regeocode) {
    const component = data.regeocode.addressComponent
    const city = (Array.isArray(component.city) ? '' : component.city) || component.province
    return {
      province: typeof component.province === 'string' ? component.province : '',
      city,
      district: typeof component.district === 'string' ? component.district : '',
      source: 'amap-regeo',
      lat,
      lng
    }
  }
  throw new Error(`Amap Regeo API error: ${JSON.stringify(data)}`)
}

const getTencentRegeo = async (lat: number, lng: number): Promise<LocationInfo> => {
  const data = await jsonp('https://apis.map.qq.com/ws/geocoder/v1/', { location: `${lat},${lng}`, key: tencentKey, output: 'jsonp' })
  if (data.status === 0 && data.result) {
    const ad_info = data.result.ad_info
    return {
      province: ad_info.province,
      city: ad_info.city,
      district: ad_info.district,
      source: 'tencent-regeo',
      lat,
      lng
    }
  }
  throw new Error(`Tencent Regeo API error: ${JSON.stringify(data)}`)
}

const getBaiduRegeo = async (lat: number, lng: number): Promise<LocationInfo> => {
  const data = await jsonp('https://api.map.baidu.com/reverse_geocoding/v3/', { location: `${lat},${lng}`, ak: baiduKey, output: 'json', coordtype: 'gcj02ll' })
  if (data.status === 0 && data.result) {
    const component = data.result.addressComponent
    return {
      province: component.province,
      city: component.city,
      district: component.district,
      source: 'baidu-regeo',
      lat,
      lng
    }
  }
  throw new Error(`Baidu Regeo API error: ${JSON.stringify(data)}`)
}

export const getCachedLocation = (): LocationInfo | null => {
  try {
    const saved = localStorage.getItem('user_location')
    if (saved) {
      const cache: CachedLocation = JSON.parse(saved)
      if (Date.now() - cache.timestamp < CACHE_TTL_MS) {
        return cache.info
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached location:', e)
  }
  return null
}

export const setCachedLocation = (loc: LocationInfo) => {
  try {
    const cache: CachedLocation = { info: loc, timestamp: Date.now() }
    localStorage.setItem('user_location', JSON.stringify(cache))
  } catch (e) {
    console.warn('Failed to save cached location:', e)
  }
}

export const clearCachedLocation = () => {
  localStorage.removeItem('user_location')
}

export const autoLocate = async (): Promise<LocationInfo> => {
  const getCoords = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
    } else {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 60000 })
    }
  })

  let gcjLat = 0, gcjLng = 0
  let coordsFound = false

  try {
    const pos = await getCoords()
    const { latitude, longitude } = pos.coords
    const [glat, glng] = wgs84togcj02(latitude, longitude)
    gcjLat = glat
    gcjLng = glng
    coordsFound = true
  } catch (e: any) {
    if (e && e.code === 1) { // PERMISSION_DENIED
      showToast('您拒绝了位置权限，将使用IP大致定位')
      console.warn('Geolocation permission denied:', e)
    } else {
      console.warn('HTML5 Geolocation failed:', e)
    }
  }

  const tryMethod = async (method: () => Promise<LocationInfo>, name: string) => {
    try {
      return await method()
    } catch (e) {
      console.warn(`[Location Fallback] ${name} failed:`, e)
      await delay(300) // Delay before retry to avoid rapid successive requests
      return null
    }
  }

  if (coordsFound) {
    let res = await tryMethod(() => getAmapRegeo(gcjLat, gcjLng), 'Amap Regeo')
    if (res) return res
    res = await tryMethod(() => getTencentRegeo(gcjLat, gcjLng), 'Tencent Regeo')
    if (res) return res
    res = await tryMethod(() => getBaiduRegeo(gcjLat, gcjLng), 'Baidu Regeo')
    if (res) return res
  }

  let res = await tryMethod(getAmapIpLocation, 'Amap IP')
  if (res) return res
  res = await tryMethod(getTencentIpLocation, 'Tencent IP')
  if (res) return res
  res = await tryMethod(getBaiduIpLocation, 'Baidu IP')
  if (res) return res

  const finalErrorMsg = coordsFound 
    ? 'All location methods failed (Precision & IP fallback both exhausted)'
    : 'All IP location methods failed'
    
  console.error(finalErrorMsg)
  throw new Error(finalErrorMsg)
}

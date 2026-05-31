import { jsonp } from './jsonp'

export interface LocationInfo {
  province?: string
  city: string
  district?: string
  source?: string
  lat?: number
  lng?: number
}

const amapKey = import.meta.env.VITE_AMAP_KEY
const tencentKey = import.meta.env.VITE_TENCENT_MAP_KEY
const baiduKey = import.meta.env.VITE_BAIDU_MAP_KEY

const getAmapIpLocation = async (): Promise<LocationInfo> => {
  const res = await fetch(`https://restapi.amap.com/v3/ip?key=${amapKey}`)
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
  throw new Error('Amap IP location failed')
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
  throw new Error('Tencent IP location failed')
}

const getBaiduIpLocation = async (): Promise<LocationInfo> => {
  const data = await jsonp('https://api.map.baidu.com/location/ip', { ak: baiduKey, coor: 'bd09ll' })
  if (data.status === 0 && data.content) {
    const detail = data.content.address_detail
    const point = data.content.point
    return {
      province: detail.province,
      city: detail.city,
      district: detail.district,
      source: 'baidu-ip',
      lat: point?.y ? parseFloat(point.y) : undefined,
      lng: point?.x ? parseFloat(point.x) : undefined
    }
  }
  throw new Error('Baidu IP location failed')
}

const getAmapRegeo = async (lat: number, lng: number): Promise<LocationInfo> => {
  const res = await fetch(`https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${amapKey}`)
  const data = await res.json()
  if (data.status === '1' && data.regeocode) {
    const component = data.regeocode.addressComponent
    return {
      province: typeof component.province === 'string' ? component.province : '',
      city: typeof component.city === 'string' && component.city.length > 0 ? component.city : component.province,
      district: typeof component.district === 'string' ? component.district : '',
      source: 'amap-regeo',
      lat,
      lng
    }
  }
  throw new Error('Amap Regeo failed')
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
  throw new Error('Tencent Regeo failed')
}

const getBaiduRegeo = async (lat: number, lng: number): Promise<LocationInfo> => {
  const data = await jsonp('https://api.map.baidu.com/reverse_geocoding/v3/', { location: `${lat},${lng}`, ak: baiduKey, output: 'json', coordtype: 'wgs84ll' })
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
  throw new Error('Baidu Regeo failed')
}

export const getCachedLocation = (): LocationInfo | null => {
  try {
    const saved = localStorage.getItem('user_location')
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return null
}

export const setCachedLocation = (loc: LocationInfo) => {
  localStorage.setItem('user_location', JSON.stringify(loc))
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

  try {
    const pos = await getCoords()
    const { latitude: lat, longitude: lng } = pos.coords
    try { return await getAmapRegeo(lat, lng) } catch (e) { console.warn(e) }
    try { return await getTencentRegeo(lat, lng) } catch (e) { console.warn(e) }
    try { return await getBaiduRegeo(lat, lng) } catch (e) { console.warn(e) }
  } catch (e) {
    console.warn('HTML5 Geolocation failed:', e)
  }

  try { return await getAmapIpLocation() } catch (e) { console.warn(e) }
  try { return await getTencentIpLocation() } catch (e) { console.warn(e) }
  try { return await getBaiduIpLocation() } catch (e) { console.warn(e) }

  throw new Error('All location methods failed')
}

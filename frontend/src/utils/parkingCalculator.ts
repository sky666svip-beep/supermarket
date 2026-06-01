// 模块：停车费核心计算逻辑与时段处理
export interface ParkingRule {
  id: number
  storeId: number
  storeName: string
  latitude: string | number
  longitude: string | number
  capacity: number
  openingHours: string
  freeDurationMinutes: number
  dayTimeRange: string | null // e.g., '07:00-23:00'
  billingMethod: 'per_time' | 'per_hour'
  dayRateSmall: string | null
  nightRateSmall: string | null
  dayRateMedium: string | null
  nightRateMedium: string | null
  dayRateLarge: string | null
  nightRateLarge: string | null
  baseHourlyRate: string | null
  baseHourlyDuration: number | null
  extraHourlyRate: string | null
  max24hRate: string | null
  newEnergyDiscount: string | null
  specialRules: string[]
  rawText: string
}

export type VehicleType = 'small' | 'medium' | 'large' | 'new_energy' | 'military'

const safeParseFloat = (val: any, fallback = 0) => {
  if (val === null || val === undefined || val === '') return fallback
  const parsed = parseFloat(val)
  return isNaN(parsed) ? fallback : parsed
}

export const calculateFee = (rule: ParkingRule, startTime: Date, endTime: Date, vehicleType: VehicleType): number => {
  const diffMs = endTime.getTime() - startTime.getTime()
  if (diffMs <= 0) return 0
  
  const minutes = Math.ceil(diffMs / 60000)

  // Military / special free vehicles
  if (vehicleType === 'military') {
    return 0
  }

  // Free duration check
  if (minutes <= rule.freeDurationMinutes) {
    return 0
  }

  let isNewEnergy = vehicleType === 'new_energy'
  let size = isNewEnergy ? 'small' : vehicleType
  let totalFee = 0

  const discount = (isNewEnergy && rule.newEnergyDiscount) ? safeParseFloat(rule.newEnergyDiscount, 1) : 1
  const max24hRate = safeParseFloat(rule.max24hRate, Infinity)

  if (rule.billingMethod === 'per_hour') {
    // progressive hourly
    const baseDuration = rule.baseHourlyDuration || 0
    const baseRate = safeParseFloat(rule.baseHourlyRate)
    const extraRate = safeParseFloat(rule.extraHourlyRate)

    const days = Math.floor(minutes / (24 * 60))
    const remainderMins = minutes % (24 * 60)
    
    let remainderFee = 0
    if (remainderMins > 0) {
      if (remainderMins <= baseDuration) {
        remainderFee = baseRate
      } else {
        remainderFee = baseRate
        const extraHours = Math.ceil((remainderMins - baseDuration) / 60)
        remainderFee += extraHours * extraRate
      }
    }
    
    // Apply discount first, then cap
    remainderFee = remainderFee * discount
    remainderFee = Math.min(remainderFee, max24hRate)
    
    // Calculate full day fee
    // A full day without cap would be baseRate + extraRate for the rest of the 24h
    let fullDayFee = baseRate + Math.ceil((24 * 60 - baseDuration) / 60) * extraRate
    fullDayFee = fullDayFee * discount
    fullDayFee = Math.min(fullDayFee, max24hRate)

    totalFee = days * fullDayFee + remainderFee

  } else if (rule.billingMethod === 'per_time') {
    // Day / Night ranges
    let dayStartH = 7, dayStartM = 0
    let nightStartH = 23, nightStartM = 0
    if (rule.dayTimeRange) {
      const [ds, ns] = rule.dayTimeRange.split('-')
      if (ds && ns) {
        dayStartH = parseInt(ds.split(':')[0]) || 7
        dayStartM = parseInt(ds.split(':')[1]) || 0
        nightStartH = parseInt(ns.split(':')[0]) || 23
        nightStartM = parseInt(ns.split(':')[1]) || 0
      }
    }

    const getRate = (isDay: boolean) => {
      let r = '0'
      if (size === 'large') {
        r = (isDay ? rule.dayRateLarge : rule.nightRateLarge) || (isDay ? rule.dayRateMedium : rule.nightRateMedium) || (isDay ? rule.dayRateSmall : rule.nightRateSmall) || '0'
      } else if (size === 'medium') {
        r = (isDay ? rule.dayRateMedium : rule.nightRateMedium) || (isDay ? rule.dayRateSmall : rule.nightRateSmall) || '0'
      } else {
        r = (isDay ? rule.dayRateSmall : rule.nightRateSmall) || '0'
      }
      return safeParseFloat(r)
    }

    const dayStartMinOfDay = dayStartH * 60 + dayStartM
    const nightStartMinOfDay = nightStartH * 60 + nightStartM

    let totalDays = Math.floor(minutes / (24 * 60))
    let remainder = minutes % (24 * 60)

    let dayRate = getRate(true)
    let nightRate = getRate(false)
    let fullDayFee = (dayRate + nightRate) * discount
    fullDayFee = Math.min(fullDayFee, max24hRate)

    if (totalDays > 0) {
      totalFee += totalDays * fullDayFee
    }
    
    if (remainder > 0) {
      let lastPeriod = -1 // 0 for day, 1 for night
      let dayCount = 0
      let nightCount = 0
      
      for(let m = 0; m < remainder; m++) {
        const checkTime = new Date(startTime.getTime() + (totalDays * 24 * 60 + m) * 60000)
        const hh = checkTime.getHours()
        const mm = checkTime.getMinutes()
        const minOfDay = hh * 60 + mm
        const isDay = (minOfDay >= dayStartMinOfDay && minOfDay < nightStartMinOfDay)
        const currentPeriod = isDay ? 0 : 1
        
        if (currentPeriod !== lastPeriod) {
          if (isDay) dayCount++
          else nightCount++
          lastPeriod = currentPeriod
        }
      }
      
      let crossFee = (dayCount * dayRate + nightCount * nightRate) * discount
      crossFee = Math.min(crossFee, max24hRate)
      totalFee += crossFee
    }
  }

  return Math.round(totalFee * 100) / 100
}

import { db } from '../src/db/index.js'
import { stores, storeParking } from '../src/db/schema.js'
import { inArray } from 'drizzle-orm'

async function main() {
  const storeNames = [
    '长申国际',
    '盛德美新区店',
    '景华店',
    '金纱店',
    '盛德美折扣店',
    '大张会员超市'
  ]

  const existingStores = await db.select().from(stores).where(inArray(stores.name, storeNames))

  const rules = {
    '长申国际': {
      capacity: 320,
      openingHours: '08:30-22:00',
      freeDurationMinutes: 30,
      dayTimeRange: null,
      billingMethod: 'per_hour' as const,
      dayRateSmall: null,
      nightRateSmall: null,
      dayRateMedium: null,
      nightRateMedium: null,
      dayRateLarge: null,
      nightRateLarge: null,
      baseHourlyRate: 3,
      baseHourlyDuration: 120,
      extraHourlyRate: 1,
      max24hRate: 20,
      newEnergyDiscount: 0.5,
      specialRules: JSON.stringify(['military_free', 'progressive_hourly']),
      rawText: '1、小型汽车：半小时内免费；2小时之内3元：2小时以上，每增加1小时加收1元，不足1小时按1小时算；停车时长为24小时，优惠后最高收费20元；2、新能源汽车在以上收费标准基础上减半收取；3、24小时后累计计费，30分钟内不再免费；4、执行任务的军警、消防、救援抢险等公务车辆免费。'
    },
    '盛德美新区店': {
      capacity: 55,
      openingHours: '全天开放',
      freeDurationMinutes: 30,
      dayTimeRange: '07:00-23:00',
      billingMethod: 'per_time' as const,
      dayRateSmall: 3,
      nightRateSmall: 10,
      dayRateMedium: 5,
      nightRateMedium: 10,
      dayRateLarge: null,
      nightRateLarge: null,
      baseHourlyRate: null,
      baseHourlyDuration: null,
      extraHourlyRate: null,
      max24hRate: null,
      newEnergyDiscount: 0.5,
      specialRules: JSON.stringify(['cross_day_night_overnight', 'different_vehicle_rates']),
      rawText: '1、实行计次收费：（1）小型汽车：白天3元/次，夜间10元/次；（2）中型汽车：白天5元/次，夜间10元/次；（3）30分钟内停车免费；2、07:00-23:00执行白天收费标准，23:00-次日07:00执行夜间收费标准；3、24小时跨时段按过夜收费标准收取，新能源汽车在以上收费标准基础上减半收取。'
    },
    '景华店': {
      capacity: 260,
      openingHours: '全天开放',
      freeDurationMinutes: 30,
      dayTimeRange: '07:00-23:00',
      billingMethod: 'per_time' as const,
      dayRateSmall: 3,
      nightRateSmall: 20,
      dayRateMedium: null,
      nightRateMedium: null,
      dayRateLarge: null,
      nightRateLarge: null,
      baseHourlyRate: null,
      baseHourlyDuration: null,
      extraHourlyRate: null,
      max24hRate: 20,
      newEnergyDiscount: 0.5,
      specialRules: JSON.stringify(['cross_day_night_overnight']),
      rawText: '1、实行计次收费：（1）小型汽车：白天3元/次，夜间20元/次；（2）30分钟内停车免费；（3）停车时长为24小时，优惠后最高收费20元；2、07:00-23:00执行白天收费标准，23:00-次日07:00执行夜间收费标准；3、24小时跨时段按过夜收费标准收取，新能源汽车在以上收费标准基础上减半收取。'
    },
    '金纱店': {
      capacity: 450,
      openingHours: '全天开放',
      freeDurationMinutes: 30,
      dayTimeRange: '07:00-23:00',
      billingMethod: 'per_time' as const,
      dayRateSmall: 3,
      nightRateSmall: 20,
      dayRateMedium: null,
      nightRateMedium: null,
      dayRateLarge: null,
      nightRateLarge: null,
      baseHourlyRate: null,
      baseHourlyDuration: null,
      extraHourlyRate: null,
      max24hRate: 20,
      newEnergyDiscount: 0.5,
      specialRules: JSON.stringify(['cross_day_night_overnight']),
      rawText: '1、实行计次收费：（1）小型汽车：白天3元/次，夜间20元/次；（2）30分钟内停车免费；（3）停车时长为24小时，优惠后最高收费20元；2、07:00-23:00执行白天收费标准，23:00-次日07:00执行夜间收费标准；3、24小时跨时段按过夜收费标准收取，新能源汽车在以上收费标准基础上减半收取。'
    },
    '盛德美折扣店': {
      capacity: 300,
      openingHours: '全天开放',
      freeDurationMinutes: 60,
      dayTimeRange: '07:00-23:00',
      billingMethod: 'per_time' as const,
      dayRateSmall: 3,
      nightRateSmall: 20,
      dayRateMedium: 5,
      nightRateMedium: 20,
      dayRateLarge: 8,
      nightRateLarge: 20,
      baseHourlyRate: null,
      baseHourlyDuration: null,
      extraHourlyRate: null,
      max24hRate: 20,
      newEnergyDiscount: 0.5,
      specialRules: JSON.stringify(['cross_day_night_overnight', 'different_vehicle_rates']),
      rawText: '1、实行计次收费：（1）小型汽车：白天3元/次，夜间20元/次；中型汽车：白天5元/次，夜间20元/次；大型汽车：白天8元/次，夜间20元/次；（2）1小时（60分钟）内停车免费；（3）停车时长为24小时，优惠后最高收费20元；2、07:00-23:00执行白天收费标准，23:00-次日07:00执行夜间收费标准；3、24小时跨时段按过夜收费标准收取，新能源汽车在以上收费标准基础上减半收取。'
    },
    '大张会员超市': {
      capacity: 500,
      openingHours: '全天开放',
      freeDurationMinutes: 90,
      dayTimeRange: '07:00-23:00',
      billingMethod: 'per_time' as const,
      dayRateSmall: 3,
      nightRateSmall: 20,
      dayRateMedium: 5,
      nightRateMedium: 20,
      dayRateLarge: 8,
      nightRateLarge: 20,
      baseHourlyRate: null,
      baseHourlyDuration: null,
      extraHourlyRate: null,
      max24hRate: 20,
      newEnergyDiscount: 0.5,
      specialRules: JSON.stringify(['cross_day_night_overnight', 'different_vehicle_rates']),
      rawText: '1、实行计次收费：（1）小型汽车：白天3元/次，夜间20元/次；中型汽车：白天5元/次，夜间20元/次；大型汽车：白天8元/次，夜间20元/次；（2）1小时30分钟（90分钟）内停车免费；（3）停车时长为24小时，优惠后最高收费20元；2、07:00-23:00执行白天收费标准，23:00-次日07:00执行夜间收费标准；3、24小时跨时段按过夜收费标准收取，新能源汽车在以上收费标准基础上减半收取。'
    }
  }

  // Clear existing
  await db.delete(storeParking)

  let inserted = 0
  for (const store of existingStores) {
    const rule = rules[store.name as keyof typeof rules]
    if (rule) {
      await db.insert(storeParking).values({
        storeId: store.id,
        ...rule
      })
      inserted++
      console.log(`Seeded parking rules for ${store.name}`)
    }
  }

  console.log(`Seeded ${inserted} store parking rules.`)
  process.exit(0)
}

main().catch(console.error)

// 模块：数据库 Schema 定义 (Drizzle ORM)
import { sqliteTable, text, integer, real, index, uniqueIndex, check, AnySQLiteColumn, customType } from 'drizzle-orm/sqlite-core'

export const sqliteTimestamp = customType<{ data: Date; driverData: string | number }>({
  dataType() { return 'integer'; },
  fromDriver(value: any) { return new Date(typeof value === 'string' ? (value.endsWith('Z') ? value : value.replace(' ', 'T') + 'Z') : value); },
  toDriver(value: any) { return value ? value.toISOString().replace('T', ' ').replace('Z', '') : null; }
});
import { sql } from 'drizzle-orm'

// Existing Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email'),
  nickname: text('nickname'),
  avatar: text('avatar'),
  role: text('role', { enum: ['customer', 'staff', 'admin'] }).notNull().default('customer'),
  isBanned: integer('is_banned', { mode: 'boolean' }).default(false),
  bannedUntil: sqliteTimestamp('banned_until'),
  nicknameUpdatedAt: sqliteTimestamp('nickname_updated_at'),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const verificationCodes = sqliteTable('verification_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  code: text('code').notNull(),
  type: text('type', { enum: ['register', 'forgot_password', 'bind_email'] }).notNull(),
  expiresAt: sqliteTimestamp('expires_at').notNull(),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// Customer: Shopping Checklist
export const checklists = sqliteTable('checklists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// Stores
export const stores = sqliteTable('stores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  province: text('province').default('河南省'),
  city: text('city'),
  district: text('district'),
  location: text('location').notNull(),
  time: text('time').notNull(),
  phone: text('phone').notNull(),
  category: text('category'),
  latitude: real('latitude'),
  longitude: real('longitude'),
})

// Customer: Feedback
export const feedbacks = sqliteTable('feedbacks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  storeId: integer('store_id').references(() => stores.id),
  facilityType: text('facility_type').notNull(),
  message: text('message').notNull(),
  images: text('images'),
  status: text('status', { enum: ['pending', 'processing', 'resolved'] }).default('pending'),
  adminReply: text('admin_reply'),
  resolvedAt: sqliteTimestamp('resolved_at'),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// Staff: Maintenance
export const maintenance = sqliteTable('maintenance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reporterId: integer('reporter_id').references(() => users.id, { onDelete: 'cascade' }),
  location: text('location').notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['pending', 'in_progress', 'completed'] }).default('pending'),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// Staff: Patrol
export const patrols = sqliteTable('patrols', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  staffId: integer('staff_id').references(() => users.id, { onDelete: 'cascade' }),
  area: text('area').notNull(),
  status: text('status', { enum: ['normal', 'abnormal'] }).notNull(),
  message: text('message'),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// Customer: Item Memos
export const itemMemos = sqliteTable('item_memos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  location: text('location'),
  price: text('price'),
  style: text('style'),
  imageUrl: text('image_url'),
  contact: text('contact'),
  category: text('category').default('未分类'),
  tags: text('tags'), // Stored as JSON string
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  completedAt: sqliteTimestamp('completed_at'),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// Notices for fragmented info
export const notices = sqliteTable('notices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storeId: integer('store_id').references(() => stores.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  images: text('images'), // JSON string array of URLs
  isUrgent: integer('is_urgent', { mode: 'boolean' }).default(false),
  expiresAt: sqliteTimestamp('expires_at'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// Community: Posts
export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  storeId: integer('store_id').references(() => stores.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  images: text('images'), // JSON array string
  category: text('category', { enum: ['商品评价', '购物分享', '寻物问答', '拼车互助'] }).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending').notNull(),
  isTop: integer('is_top', { mode: 'boolean' }).default(false),
  isElite: integer('is_elite', { mode: 'boolean' }).default(false),
  viewCount: integer('view_count').default(0),
  likeCount: integer('like_count').default(0),
  commentCount: integer('comment_count').default(0),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: sqliteTimestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userCatStatusIdx: index('posts_user_category_status_idx').on(table.userId, table.category, table.status)
}))

// Community: Comments
export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').references(() => posts.id).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  parentId: integer('parent_id').references((): AnySQLiteColumn => comments.id), // Self-referencing for replies
  content: text('content').notNull(),
  images: text('images'), // JSON array string
  likeCount: integer('like_count').default(0),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  postIdx: index('comments_post_idx').on(table.postId)
}))

// Community: Post Likes
export const postLikes = sqliteTable('post_likes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  postId: integer('post_id').references(() => posts.id).notNull(),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uidPidIdx: uniqueIndex('post_likes_uid_pid_idx').on(table.userId, table.postId)
}))

// Community: Comment Likes
export const commentLikes = sqliteTable('comment_likes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  commentId: integer('comment_id').references(() => comments.id).notNull(),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uidCidIdx: uniqueIndex('comment_likes_uid_cid_idx').on(table.userId, table.commentId)
}))

// Community: Post Collections
export const postCollections = sqliteTable('post_collections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  postId: integer('post_id').references(() => posts.id).notNull(),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uidPidIdx: uniqueIndex('post_collections_uid_pid_idx').on(table.userId, table.postId)
}))

// Community: Reports
export const reports = sqliteTable('reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  targetType: text('target_type', { enum: ['post', 'comment'] }).notNull(), // post / comment
  targetId: integer('target_id').notNull(),
  reason: text('reason').notNull(),
  description: text('description'), // Optional detailed reason
  status: text('status', { enum: ['pending', 'resolved', 'rejected'] }).default('pending').notNull(),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uidTargetIdx: uniqueIndex('reports_uid_target_idx').on(table.userId, table.targetType, table.targetId)
}))

// Temporary Activities
export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  images: text('images'), // JSON string array of URLs
  startTime: sqliteTimestamp('start_time'),
  endTime: sqliteTimestamp('end_time'),
  isAllStores: integer('is_all_stores', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  timeCheck: check('activities_time_check', sql`${table.endTime} > ${table.startTime}`)
}))

export const activityStores = sqliteTable('activity_stores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  activityId: integer('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  storeId: integer('store_id').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  actStoreIdx: uniqueIndex('activity_stores_act_store_idx').on(table.activityId, table.storeId)
}))

// Customer Traffic
export const storeTraffic = sqliteTable('store_traffic', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storeId: integer('store_id').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  floor: integer('floor'), // -3 to 8
  level: integer('level').notNull(), // 1: green, 2: yellow, 3: orange, 4: red
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(), // To restrict 1 submission per hour
  dateHour: text('date_hour').notNull(), // format YYYY-MM-DD-HH
  createdAt: sqliteTimestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueStoreFloorUserHour: uniqueIndex('store_traffic_unique_idx').on(table.storeId, table.floor, table.userId, table.dateHour)
}))

// Store Parking Rules
export const storeParking = sqliteTable('store_parking', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storeId: integer('store_id').references(() => stores.id, { onDelete: 'cascade' }).notNull().unique(),
  capacity: integer('capacity').notNull(),
  openingHours: text('opening_hours').notNull(),
  freeDurationMinutes: integer('free_duration_minutes').notNull(),
  dayTimeRange: text('day_time_range'), // e.g. "07:00-23:00"
  billingMethod: text('billing_method', { enum: ['per_time', 'per_hour'] }).notNull(), // per_time, per_hour
  dayRateSmall: real('day_rate_small'),
  nightRateSmall: real('night_rate_small'),
  dayRateMedium: real('day_rate_medium'),
  nightRateMedium: real('night_rate_medium'),
  dayRateLarge: real('day_rate_large'),
  nightRateLarge: real('night_rate_large'),
  baseHourlyRate: real('base_hourly_rate'), // e.g., 3 for first 2 hours
  baseHourlyDuration: integer('base_hourly_duration'), // e.g., 120 (mins)
  extraHourlyRate: real('extra_hourly_rate'), // e.g., 1 for each extra hour
  max24hRate: real('max_24h_rate'), // e.g., 20
  newEnergyDiscount: real('new_energy_discount'), // e.g., 0.5
  specialRules: text('special_rules'), // JSON string array e.g. '["military_free", "cross_day_night"]'
  rawText: text('raw_text').notNull(),
  updatedAt: sqliteTimestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// Existing Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  nickname: text('nickname'),
  avatar: text('avatar'),
  role: text('role', { enum: ['customer', 'staff', 'admin'] }).notNull().default('customer'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Customer: Shopping Checklist
export const checklists = sqliteTable('checklists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  title: text('title').notNull(),
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
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
  latitude: text('latitude'), // Store as text or real, sqlite handles both. But better use real
  longitude: text('longitude'),
})

// Customer: Feedback
export const feedbacks = sqliteTable('feedbacks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  storeId: integer('store_id').references(() => stores.id),
  facilityType: text('facility_type').notNull(),
  message: text('message').notNull(),
  images: text('images'),
  status: text('status', { enum: ['pending', 'processing', 'resolved'] }).default('pending'),
  adminReply: text('admin_reply'),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Staff: Maintenance
export const maintenance = sqliteTable('maintenance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reporterId: integer('reporter_id').references(() => users.id),
  location: text('location').notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['pending', 'in_progress', 'completed'] }).default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Staff: Patrol
export const patrols = sqliteTable('patrols', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  staffId: integer('staff_id').references(() => users.id),
  area: text('area').notNull(),
  status: text('status', { enum: ['normal', 'abnormal'] }).notNull(),
  message: text('message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Customer: Item Memos
export const itemMemos = sqliteTable('item_memos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  location: text('location'),
  price: text('price'),
  style: text('style'),
  imageUrl: text('image_url'),
  contact: text('contact'),
  category: text('category').default('未分类'),
  tags: text('tags'), // Stored as JSON string
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Notices for fragmented info
export const notices = sqliteTable('notices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storeId: integer('store_id').references(() => stores.id), // Added storeId
  title: text('title').notNull(),
  content: text('content').notNull(),
  images: text('images'), // JSON string array of URLs
  isUrgent: integer('is_urgent', { mode: 'boolean' }).default(false), // To display in NoticeBar
  expiresAt: integer('expires_at', { mode: 'timestamp' }), // Automatically hide after this date
  isActive: integer('is_active', { mode: 'boolean' }).default(true), // For manual deletion/hiding
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Community: Posts
export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  storeId: integer('store_id').references(() => stores.id), // Added storeId
  title: text('title').notNull(),
  content: text('content').notNull(),
  images: text('images'), // JSON array string
  category: text('category', { enum: ['商品评价', '购物分享'] }).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending').notNull(),
  isTop: integer('is_top', { mode: 'boolean' }).default(false),
  isElite: integer('is_elite', { mode: 'boolean' }).default(false),
  viewCount: integer('view_count').default(0),
  likeCount: integer('like_count').default(0),
  commentCount: integer('comment_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Community: Comments
export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').references(() => posts.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  parentId: integer('parent_id'), // Self-referencing for replies
  content: text('content').notNull(),
  images: text('images'), // JSON array string
  likeCount: integer('like_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Community: Post Likes
export const postLikes = sqliteTable('post_likes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  postId: integer('post_id').references(() => posts.id).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Community: Comment Likes
export const commentLikes = sqliteTable('comment_likes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  commentId: integer('comment_id').references(() => comments.id).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Community: Post Collections
export const postCollections = sqliteTable('post_collections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  postId: integer('post_id').references(() => posts.id).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Community: Reports
export const reports = sqliteTable('reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  targetType: text('target_type', { enum: ['post', 'comment'] }).notNull(),
  targetId: integer('target_id').notNull(),
  reason: text('reason').notNull(),
  status: text('status', { enum: ['pending', 'resolved'] }).default('pending').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

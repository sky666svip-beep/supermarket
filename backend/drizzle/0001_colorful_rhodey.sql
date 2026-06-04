PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_checklists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`title` text NOT NULL,
	`is_completed` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_checklists`("id", "user_id", "title", "is_completed", "created_at") SELECT "id", "user_id", "title", "is_completed", "created_at" FROM `checklists`;--> statement-breakpoint
DROP TABLE `checklists`;--> statement-breakpoint
ALTER TABLE `__new_checklists` RENAME TO `checklists`;--> statement-breakpoint

CREATE TABLE `__new_comment_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_comment_likes`("id", "user_id", "comment_id", "created_at") SELECT "id", "user_id", "comment_id", "created_at" FROM `comment_likes`;--> statement-breakpoint
DROP TABLE `comment_likes`;--> statement-breakpoint
ALTER TABLE `__new_comment_likes` RENAME TO `comment_likes`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `comment_likes_uid_cid_idx` ON `comment_likes` (`user_id`,`comment_id`);--> statement-breakpoint
CREATE TABLE `__new_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`parent_id` integer,
	`content` text NOT NULL,
	`images` text,
	`like_count` integer DEFAULT 0,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_comments`("id", "post_id", "user_id", "parent_id", "content", "images", "like_count", "created_at") SELECT "id", "post_id", "user_id", "parent_id", "content", "images", "like_count", "created_at" FROM `comments`;--> statement-breakpoint
DROP TABLE `comments`;--> statement-breakpoint
ALTER TABLE `__new_comments` RENAME TO `comments`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `comments_post_idx` ON `comments` (`post_id`);--> statement-breakpoint
CREATE TABLE `__new_feedbacks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`store_id` integer,
	`facility_type` text NOT NULL,
	`message` text NOT NULL,
	`images` text,
	`status` text DEFAULT 'pending',
	`admin_reply` text,
	`resolved_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_feedbacks`("id", "user_id", "store_id", "facility_type", "message", "images", "status", "admin_reply", "resolved_at", "created_at") SELECT "id", "user_id", "store_id", "facility_type", "message", "images", "status", "admin_reply", "resolved_at", "created_at" FROM `feedbacks`;--> statement-breakpoint
DROP TABLE `feedbacks`;--> statement-breakpoint
ALTER TABLE `__new_feedbacks` RENAME TO `feedbacks`;--> statement-breakpoint
CREATE TABLE `__new_item_memos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`location` text,
	`price` text,
	`style` text,
	`image_url` text,
	`contact` text,
	`category` text DEFAULT '未分类',
	`tags` text,
	`is_completed` integer DEFAULT false,
	`completed_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_item_memos`("id", "user_id", "location", "price", "style", "image_url", "contact", "category", "tags", "is_completed", "completed_at", "created_at") SELECT "id", "user_id", "location", "price", "style", "image_url", "contact", "category", "tags", "is_completed", "completed_at", "created_at" FROM `item_memos`;--> statement-breakpoint
DROP TABLE `item_memos`;--> statement-breakpoint
ALTER TABLE `__new_item_memos` RENAME TO `item_memos`;--> statement-breakpoint
CREATE TABLE `__new_maintenance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reporter_id` integer,
	`location` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'pending',
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_maintenance`("id", "reporter_id", "location", "message", "status", "created_at") SELECT "id", "reporter_id", "location", "message", "status", "created_at" FROM `maintenance`;--> statement-breakpoint
DROP TABLE `maintenance`;--> statement-breakpoint
ALTER TABLE `__new_maintenance` RENAME TO `maintenance`;--> statement-breakpoint
CREATE TABLE `__new_patrols` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_id` integer,
	`area` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_patrols`("id", "staff_id", "area", "status", "message", "created_at") SELECT "id", "staff_id", "area", "status", "message", "created_at" FROM `patrols`;--> statement-breakpoint
DROP TABLE `patrols`;--> statement-breakpoint
ALTER TABLE `__new_patrols` RENAME TO `patrols`;--> statement-breakpoint
CREATE TABLE `__new_post_collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`post_id` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_post_collections`("id", "user_id", "post_id", "created_at") SELECT "id", "user_id", "post_id", "created_at" FROM `post_collections`;--> statement-breakpoint
DROP TABLE `post_collections`;--> statement-breakpoint
ALTER TABLE `__new_post_collections` RENAME TO `post_collections`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `post_collections_uid_pid_idx` ON `post_collections` (`user_id`,`post_id`);--> statement-breakpoint
CREATE TABLE `__new_post_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`post_id` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_post_likes`("id", "user_id", "post_id", "created_at") SELECT "id", "user_id", "post_id", "created_at" FROM `post_likes`;--> statement-breakpoint
DROP TABLE `post_likes`;--> statement-breakpoint
ALTER TABLE `__new_post_likes` RENAME TO `post_likes`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `post_likes_uid_pid_idx` ON `post_likes` (`user_id`,`post_id`);--> statement-breakpoint
CREATE TABLE `__new_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`store_id` integer,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`images` text,
	`category` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_top` integer DEFAULT false,
	`is_elite` integer DEFAULT false,
	`view_count` integer DEFAULT 0,
	`like_count` integer DEFAULT 0,
	`comment_count` integer DEFAULT 0,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_posts`("id", "user_id", "store_id", "title", "content", "images", "category", "status", "is_top", "is_elite", "view_count", "like_count", "comment_count", "created_at", "updated_at") SELECT "id", "user_id", "store_id", "title", "content", "images", "category", "status", "is_top", "is_elite", "view_count", "like_count", "comment_count", "created_at", "updated_at" FROM `posts`;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `__new_posts` RENAME TO `posts`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `posts_user_category_status_idx` ON `posts` (`user_id`,`category`,`status`);--> statement-breakpoint
CREATE TABLE `__new_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`reason` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_reports`("id", "user_id", "target_type", "target_id", "reason", "description", "status", "created_at") SELECT "id", "user_id", "target_type", "target_id", "reason", "description", "status", "created_at" FROM `reports`;--> statement-breakpoint
DROP TABLE `reports`;--> statement-breakpoint
ALTER TABLE `__new_reports` RENAME TO `reports`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `reports_uid_target_idx` ON `reports` (`user_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `__new_store_traffic` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`store_id` integer NOT NULL,
	`floor` integer,
	`level` integer NOT NULL,
	`user_id` integer NOT NULL,
	`date_hour` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_store_traffic`("id", "store_id", "floor", "level", "user_id", "date_hour", "created_at") SELECT "id", "store_id", "floor", "level", "user_id", "date_hour", "created_at" FROM `store_traffic`;--> statement-breakpoint
DROP TABLE `store_traffic`;--> statement-breakpoint
ALTER TABLE `__new_store_traffic` RENAME TO `store_traffic`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `store_traffic_unique_idx` ON `store_traffic` (`store_id`,`floor`,`user_id`,`date_hour`);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `activity_stores_act_store_idx` ON `activity_stores` (`activity_id`,`store_id`);
PRAGMA foreign_keys=ON;--> statement-breakpoint
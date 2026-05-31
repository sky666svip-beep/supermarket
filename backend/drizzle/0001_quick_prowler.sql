CREATE TABLE `notices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`images` text,
	`is_urgent` integer DEFAULT false,
	`expires_at` integer,
	`is_active` integer DEFAULT true,
	`created_at` integer
);

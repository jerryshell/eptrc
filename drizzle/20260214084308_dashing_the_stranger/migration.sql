CREATE TABLE `notify` (
	`id` text PRIMARY KEY,
	`created_at` integer,
	`updated_at` integer,
	`payment_session_id` text,
	`notify_url` text,
	`request_path` text,
	`request_body` text,
	`status` text,
	`retry_count` integer,
	`max_retry_count` integer,
	`last_retry_at` integer
);
--> statement-breakpoint
CREATE TABLE `payment_session` (
	`id` text PRIMARY KEY,
	`created_at` integer,
	`updated_at` integer,
	`metadata` text,
	`amount` text,
	`notify_url` text,
	`address` text,
	`status` text,
	`collected` integer,
	`blockchain_tx_id` text,
	`paid_at` integer,
	`expires_at` integer,
	`last_checked_at` integer,
	`collected_at` integer
);
--> statement-breakpoint
CREATE TABLE `wallet` (
	`id` text PRIMARY KEY,
	`created_at` integer,
	`updated_at` integer,
	`public_key` text,
	`private_key` text,
	`address` text
);

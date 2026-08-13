CREATE TABLE `product_platform_bindings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`platform_code` text NOT NULL,
	`goods_code` text NOT NULL,
	`goods_name` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_platform_bindings_platform_goods_idx` ON `product_platform_bindings` (`platform_code`,`goods_code`);--> statement-breakpoint
CREATE INDEX `product_platform_bindings_product_idx` ON `product_platform_bindings` (`product_id`);
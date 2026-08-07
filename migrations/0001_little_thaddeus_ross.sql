CREATE TABLE `platforms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platforms_code_unique` ON `platforms` (`code`);
--> statement-breakpoint
INSERT INTO `platforms` (`code`, `enabled`) VALUES ('MOMO_MAIN', 1);
--> statement-breakpoint
INSERT INTO `platforms` (`code`, `enabled`) VALUES ('MO_STORE_PLUS', 1);
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`price` real NOT NULL,
	`quantity` numeric DEFAULT 0 NOT NULL,
	`description` text
);

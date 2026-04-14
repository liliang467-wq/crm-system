CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wxId` varchar(128) NOT NULL,
	`customerName` varchar(64),
	`sourceChannel` varchar(64),
	`salesAmount` decimal(12,2),
	`customerBirthday` varchar(64),
	`contactName` varchar(64),
	`contactBirthday` varchar(64),
	`notes` text,
	`createdById` int NOT NULL,
	`organizationId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`leaderId` int,
	`parentId` int,
	`grandParentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `source_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `source_channels_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_channels_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('employee','manager','sysadmin') NOT NULL DEFAULT 'employee';--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;
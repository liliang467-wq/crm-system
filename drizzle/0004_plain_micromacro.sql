CREATE INDEX `idx_customers_createdById` ON `customers` (`createdById`);--> statement-breakpoint
CREATE INDEX `idx_customers_organizationId` ON `customers` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_customers_createdAt` ON `customers` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_customers_sourceChannel` ON `customers` (`sourceChannel`);--> statement-breakpoint
CREATE INDEX `idx_customers_orgId_createdAt` ON `customers` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_customers_createdById_createdAt` ON `customers` (`createdById`,`createdAt`);
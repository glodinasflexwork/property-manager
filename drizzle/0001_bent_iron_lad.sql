CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`category` enum('repair','renovation','inspection','legal','other') NOT NULL,
	`budgetedAmount` int NOT NULL,
	`year` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cashFlow` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`monthlyRent` int NOT NULL,
	`mortgage` int NOT NULL DEFAULT 0,
	`propertyTax` int NOT NULL DEFAULT 0,
	`insurance` int NOT NULL DEFAULT 0,
	`maintenance` int NOT NULL DEFAULT 0,
	`hoaFees` int NOT NULL DEFAULT 0,
	`utilities` int NOT NULL DEFAULT 0,
	`other` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cashFlow_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`propertyId` int NOT NULL,
	`category` enum('repair','renovation','inspection','legal','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`amount` int NOT NULL,
	`invoiceDate` timestamp NOT NULL,
	`fileUrl` text,
	`fileKey` varchar(500),
	`filename` varchar(255),
	`mimeType` varchar(100),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`streetName` varchar(255) NOT NULL,
	`houseNumber` varchar(50) NOT NULL,
	`addition` varchar(50),
	`city` varchar(255) NOT NULL,
	`province` varchar(255),
	`postalCode` varchar(20) NOT NULL,
	`purchasePrice` int NOT NULL,
	`purchaseDate` timestamp NOT NULL,
	`salePrice` int,
	`saleDate` timestamp,
	`status` enum('owned','sold','rented','reserved') NOT NULL DEFAULT 'owned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `propertyPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`filename` varchar(255),
	`mimeType` varchar(100),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `propertyPhotos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`stripeCustomerId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`stripePriceId` varchar(255),
	`status` enum('active','canceled','past_due','trialing','incomplete') NOT NULL DEFAULT 'trialing',
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`seats` int NOT NULL DEFAULT 1,
	`pricePerSeat` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_organizationId_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `teamMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','administrator','editor','viewer') NOT NULL DEFAULT 'viewer',
	`invitedBy` int,
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	CONSTRAINT `teamMembers_id` PRIMARY KEY(`id`)
);

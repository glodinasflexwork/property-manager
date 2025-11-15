CREATE TYPE "public"."budget_category" AS ENUM('repair', 'renovation', 'inspection', 'legal', 'other');--> statement-breakpoint
CREATE TYPE "public"."invoice_category" AS ENUM('repair', 'renovation', 'inspection', 'legal', 'other');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('owned', 'sold', 'rented', 'reserved');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."team_member_role" AS ENUM('owner', 'administrator', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "budgets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"propertyId" integer NOT NULL,
	"category" "budget_category" NOT NULL,
	"budgetedAmount" integer NOT NULL,
	"year" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cashFlow" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cashFlow_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"propertyId" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"monthlyRent" integer NOT NULL,
	"mortgage" integer DEFAULT 0 NOT NULL,
	"propertyTax" integer DEFAULT 0 NOT NULL,
	"insurance" integer DEFAULT 0 NOT NULL,
	"maintenance" integer DEFAULT 0 NOT NULL,
	"hoaFees" integer DEFAULT 0 NOT NULL,
	"utilities" integer DEFAULT 0 NOT NULL,
	"other" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organizationId" integer NOT NULL,
	"propertyId" integer NOT NULL,
	"category" "invoice_category" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"amount" integer NOT NULL,
	"invoiceDate" timestamp NOT NULL,
	"fileUrl" text,
	"fileKey" varchar(500),
	"filename" varchar(255),
	"mimeType" varchar(100),
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organizations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"ownerId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "properties_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organizationId" integer NOT NULL,
	"streetName" varchar(255) NOT NULL,
	"houseNumber" varchar(50) NOT NULL,
	"addition" varchar(50),
	"city" varchar(255) NOT NULL,
	"province" varchar(255),
	"postalCode" varchar(20) NOT NULL,
	"purchasePrice" integer NOT NULL,
	"purchaseDate" timestamp NOT NULL,
	"salePrice" integer,
	"saleDate" timestamp,
	"status" "property_status" DEFAULT 'owned' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propertyPhotos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "propertyPhotos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"propertyId" integer NOT NULL,
	"url" text NOT NULL,
	"fileKey" varchar(500) NOT NULL,
	"filename" varchar(255),
	"mimeType" varchar(100),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organizationId" integer NOT NULL,
	"stripeCustomerId" varchar(255),
	"stripeSubscriptionId" varchar(255),
	"stripePriceId" varchar(255),
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"currentPeriodStart" timestamp,
	"currentPeriodEnd" timestamp,
	"seats" integer DEFAULT 1 NOT NULL,
	"pricePerSeat" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_organizationId_unique" UNIQUE("organizationId")
);
--> statement-breakpoint
CREATE TABLE "teamMembers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "teamMembers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organizationId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" "team_member_role" DEFAULT 'viewer' NOT NULL,
	"invitedBy" integer,
	"invitedAt" timestamp DEFAULT now() NOT NULL,
	"acceptedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);

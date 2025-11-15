import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Define enums for PostgreSQL
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const teamMemberRoleEnum = pgEnum("team_member_role", ["owner", "administrator", "editor", "viewer"]);
export const propertyStatusEnum = pgEnum("property_status", ["owned", "sold", "rented", "reserved"]);
export const invoiceCategoryEnum = pgEnum("invoice_category", ["repair", "renovation", "inspection", "legal", "other"]);
export const budgetCategoryEnum = pgEnum("budget_category", ["repair", "renovation", "inspection", "legal", "other"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "canceled", "past_due", "trialing", "incomplete"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  /** Email address for magic link authentication. Unique per user. */
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: text("name"),
  /** Legacy OAuth identifier - nullable for backward compatibility */
  openId: varchar("openId", { length: 64 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Organizations table - Each user can belong to one or more organizations
 */
export const organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: integer("ownerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Team members table - Links users to organizations with roles
 */
export const teamMembers = pgTable("teamMembers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organizationId").notNull(),
  userId: integer("userId").notNull(),
  role: teamMemberRoleEnum("role").default("viewer").notNull(),
  invitedBy: integer("invitedBy"),
  invitedAt: timestamp("invitedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

/**
 * Properties table - Core property information
 */
export const properties = pgTable("properties", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organizationId").notNull(),
  streetName: varchar("streetName", { length: 255 }).notNull(),
  houseNumber: varchar("houseNumber", { length: 50 }).notNull(),
  addition: varchar("addition", { length: 50 }),
  city: varchar("city", { length: 255 }).notNull(),
  province: varchar("province", { length: 255 }),
  postalCode: varchar("postalCode", { length: 20 }).notNull(),
  purchasePrice: integer("purchasePrice").notNull(), // in cents
  purchaseDate: timestamp("purchaseDate").notNull(),
  salePrice: integer("salePrice"), // in cents
  saleDate: timestamp("saleDate"),
  status: propertyStatusEnum("status").default("owned").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Property photos table
 */
export const propertyPhotos = pgTable("propertyPhotos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("propertyId").notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  filename: varchar("filename", { length: 255 }),
  mimeType: varchar("mimeType", { length: 100 }),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyPhoto = typeof propertyPhotos.$inferSelect;
export type InsertPropertyPhoto = typeof propertyPhotos.$inferInsert;

/**
 * Invoices table - Expense tracking
 */
export const invoices = pgTable("invoices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organizationId").notNull(),
  propertyId: integer("propertyId").notNull(),
  category: invoiceCategoryEnum("category").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: integer("amount").notNull(), // in cents
  invoiceDate: timestamp("invoiceDate").notNull(),
  fileUrl: text("fileUrl"),
  fileKey: varchar("fileKey", { length: 500 }),
  filename: varchar("filename", { length: 255 }),
  mimeType: varchar("mimeType", { length: 100 }),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Budgets table - Budget items per property
 */
export const budgets = pgTable("budgets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("propertyId").notNull(),
  category: budgetCategoryEnum("category").notNull(),
  budgetedAmount: integer("budgetedAmount").notNull(), // in cents
  year: integer("year").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

/**
 * Cash flow table - Monthly income and expenses per property
 */
export const cashFlow = pgTable("cashFlow", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("propertyId").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  monthlyRent: integer("monthlyRent").notNull(), // in cents
  mortgage: integer("mortgage").default(0).notNull(), // in cents
  propertyTax: integer("propertyTax").default(0).notNull(),
  insurance: integer("insurance").default(0).notNull(),
  maintenance: integer("maintenance").default(0).notNull(),
  hoaFees: integer("hoaFees").default(0).notNull(),
  utilities: integer("utilities").default(0).notNull(),
  other: integer("other").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CashFlow = typeof cashFlow.$inferSelect;
export type InsertCashFlow = typeof cashFlow.$inferInsert;

/**
 * Stripe subscriptions table - Track billing
 */
export const subscriptions = pgTable("subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organizationId").notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  status: subscriptionStatusEnum("status").default("trialing").notNull(),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  seats: integer("seats").default(1).notNull(),
  pricePerSeat: integer("pricePerSeat").default(0).notNull(), // in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Magic link tokens table - Store temporary authentication tokens
 */
export const magicLinkTokens = pgTable("magicLinkTokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type InsertMagicLinkToken = typeof magicLinkTokens.$inferInsert;

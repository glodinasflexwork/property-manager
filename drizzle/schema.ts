import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Organizations table - Each user can belong to one or more organizations
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: int("ownerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Team members table - Links users to organizations with roles
 */
export const teamMembers = mysqlTable("teamMembers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "administrator", "editor", "viewer"]).default("viewer").notNull(),
  invitedBy: int("invitedBy"),
  invitedAt: timestamp("invitedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

/**
 * Properties table - Core property information
 */
export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  streetName: varchar("streetName", { length: 255 }).notNull(),
  houseNumber: varchar("houseNumber", { length: 50 }).notNull(),
  addition: varchar("addition", { length: 50 }),
  city: varchar("city", { length: 255 }).notNull(),
  province: varchar("province", { length: 255 }),
  postalCode: varchar("postalCode", { length: 20 }).notNull(),
  purchasePrice: int("purchasePrice").notNull(), // in cents
  purchaseDate: timestamp("purchaseDate").notNull(),
  salePrice: int("salePrice"), // in cents
  saleDate: timestamp("saleDate"),
  status: mysqlEnum("status", ["owned", "sold", "rented", "reserved"]).default("owned").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Property photos table
 */
export const propertyPhotos = mysqlTable("propertyPhotos", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  filename: varchar("filename", { length: 255 }),
  mimeType: varchar("mimeType", { length: 100 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyPhoto = typeof propertyPhotos.$inferSelect;
export type InsertPropertyPhoto = typeof propertyPhotos.$inferInsert;

/**
 * Invoices table - Expense tracking
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  propertyId: int("propertyId").notNull(),
  category: mysqlEnum("category", ["repair", "renovation", "inspection", "legal", "other"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: int("amount").notNull(), // in cents
  invoiceDate: timestamp("invoiceDate").notNull(),
  fileUrl: text("fileUrl"),
  fileKey: varchar("fileKey", { length: 500 }),
  filename: varchar("filename", { length: 255 }),
  mimeType: varchar("mimeType", { length: 100 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Budgets table - Budget items per property
 */
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  category: mysqlEnum("category", ["repair", "renovation", "inspection", "legal", "other"]).notNull(),
  budgetedAmount: int("budgetedAmount").notNull(), // in cents
  year: int("year").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

/**
 * Cash flow table - Monthly income and expenses per property
 */
export const cashFlow = mysqlTable("cashFlow", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(), // 1-12
  monthlyRent: int("monthlyRent").notNull(), // in cents
  mortgage: int("mortgage").default(0).notNull(), // in cents
  propertyTax: int("propertyTax").default(0).notNull(),
  insurance: int("insurance").default(0).notNull(),
  maintenance: int("maintenance").default(0).notNull(),
  hoaFees: int("hoaFees").default(0).notNull(),
  utilities: int("utilities").default(0).notNull(),
  other: int("other").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CashFlow = typeof cashFlow.$inferSelect;
export type InsertCashFlow = typeof cashFlow.$inferInsert;

/**
 * Stripe subscriptions table - Track billing
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "trialing", "incomplete"]).default("trialing").notNull(),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  seats: int("seats").default(1).notNull(),
  pricePerSeat: int("pricePerSeat").default(0).notNull(), // in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
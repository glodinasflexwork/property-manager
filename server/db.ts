import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { InsertUser, users, magicLinkTokens, InsertMagicLinkToken } from "../drizzle/schema";
import { ENV } from './_core/env';
import ws from 'ws';

// Configure WebSocket for Neon serverless in Node.js environment
if (typeof WebSocket === 'undefined') {
  global.WebSocket = ws as any;
}

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.email && !user.openId) {
    throw new Error("User email or openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Check if user exists by email or openId
    let existingUser;
    if (user.email) {
      existingUser = await getUserByEmail(user.email);
    } else if (user.openId) {
      existingUser = await getUserByOpenId(user.openId);
    }

    if (existingUser) {
      // Update existing user
      const updateData: Partial<InsertUser> = {};
      if (user.name !== undefined) updateData.name = user.name;
      if (user.email !== undefined) updateData.email = user.email;
      if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod;
      if (user.lastSignedIn !== undefined) updateData.lastSignedIn = user.lastSignedIn;
      if (user.role !== undefined) updateData.role = user.role;
      
      if (Object.keys(updateData).length > 0) {
        await db.update(users).set(updateData).where(eq(users.id, existingUser.id));
      }
    } else {
      // Create new user
      const newUser: InsertUser = {
        email: user.email!,
        name: user.name ?? null,
        openId: user.openId ?? null,
        loginMethod: user.loginMethod ?? null,
        role: user.role ?? 'user',
        lastSignedIn: user.lastSignedIn ?? new Date(),
      };
      await db.insert(users).values(newUser);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

import {
  organizations,
  InsertOrganization,
  teamMembers,
  InsertTeamMember,
  properties,
  InsertProperty,
  propertyPhotos,
  InsertPropertyPhoto,
  invoices,
  InsertInvoice,
  budgets,
  InsertBudget,
  cashFlow,
  InsertCashFlow,
  subscriptions,
  InsertSubscription,
} from "../drizzle/schema";
import { and, desc, sql } from "drizzle-orm";

// ============================================
// ORGANIZATIONS
// ============================================

export async function createOrganization(org: InsertOrganization) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(organizations).values(org).returning({ id: organizations.id });
  return result[0].id;
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result[0];
}

export async function getOrganizationsByOwnerId(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).where(eq(organizations.ownerId, ownerId));
}

// ============================================
// TEAM MEMBERS
// ============================================

export async function addTeamMember(member: InsertTeamMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teamMembers).values(member).returning({ id: teamMembers.id });
  return result[0].id;
}

export async function getTeamMembersByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: teamMembers.id,
      organizationId: teamMembers.organizationId,
      userId: teamMembers.userId,
      role: teamMembers.role,
      invitedBy: teamMembers.invitedBy,
      invitedAt: teamMembers.invitedAt,
      acceptedAt: teamMembers.acceptedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.organizationId, organizationId));
}

export async function getUserRole(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.organizationId, organizationId)))
    .limit(1);
  return result[0]?.role;
}

// ============================================
// PROPERTIES
// ============================================

export async function createProperty(property: InsertProperty) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(properties).values(property).returning({ id: properties.id });
  return result[0].id;
}

export async function updateProperty(id: number, property: Partial<InsertProperty>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(properties).set(property).where(eq(properties.id, id));
}

export async function deleteProperty(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(properties).where(eq(properties.id, id));
}

export async function getPropertyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return result[0];
}

export async function getPropertiesByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(properties).where(eq(properties.organizationId, organizationId)).orderBy(desc(properties.createdAt));
}

// ============================================
// PROPERTY PHOTOS
// ============================================

export async function addPropertyPhoto(photo: InsertPropertyPhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(propertyPhotos).values(photo).returning({ id: propertyPhotos.id });
  return result[0].id;
}

export async function getPropertyPhotos(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(propertyPhotos).where(eq(propertyPhotos.propertyId, propertyId)).orderBy(propertyPhotos.sortOrder);
}

export async function deletePropertyPhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(propertyPhotos).where(eq(propertyPhotos.id, id));
}

// ============================================
// INVOICES
// ============================================

export async function createInvoice(invoice: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invoices).values(invoice).returning({ id: invoices.id });
  return result[0].id;
}

export async function updateInvoice(id: number, invoice: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invoices).set(invoice).where(eq(invoices.id, id));
}

export async function deleteInvoice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(invoices).where(eq(invoices.id, id));
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result[0];
}

export async function getInvoicesByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.organizationId, organizationId)).orderBy(desc(invoices.invoiceDate));
}

export async function getInvoicesByProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.propertyId, propertyId)).orderBy(desc(invoices.invoiceDate));
}

export async function getInvoicesByPropertyAndCategory(propertyId: number, category: "repair" | "renovation" | "inspection" | "legal" | "other") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(and(eq(invoices.propertyId, propertyId), sql`${invoices.category} = ${category}`));
}

// ============================================
// BUDGETS
// ============================================

export async function createBudget(budget: InsertBudget) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(budgets).values(budget).returning({ id: budgets.id });
  return result[0].id;
}

export async function updateBudget(id: number, budget: Partial<InsertBudget>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(budgets).set(budget).where(eq(budgets.id, id));
}

export async function deleteBudget(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(budgets).where(eq(budgets.id, id));
}

export async function getBudgetsByProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgets).where(eq(budgets.propertyId, propertyId));
}

// ============================================
// CASH FLOW
// ============================================

export async function upsertCashFlow(flow: InsertCashFlow) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if exists
  const existing = await db
    .select()
    .from(cashFlow)
    .where(
      and(
        eq(cashFlow.propertyId, flow.propertyId),
        eq(cashFlow.year, flow.year),
        eq(cashFlow.month, flow.month)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(cashFlow)
      .set(flow)
      .where(eq(cashFlow.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(cashFlow).values(flow).returning({ id: cashFlow.id });
    return result[0].id;
  }
}

export async function getCashFlowByProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cashFlow).where(eq(cashFlow.propertyId, propertyId)).orderBy(cashFlow.year, cashFlow.month);
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export async function upsertSubscription(subscription: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, subscription.organizationId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(subscriptions)
      .set(subscription)
      .where(eq(subscriptions.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(subscriptions).values(subscription).returning({ id: subscriptions.id });
    return result[0].id;
  }
}

export async function getSubscriptionByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId)).limit(1);
  return result[0];
}

// ============================================
// ANALYTICS / INSIGHTS
// ============================================

export async function getOrganizationStats(organizationId: number) {
  const db = await getDb();
  if (!db) return null;

  const [propertiesCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(eq(properties.organizationId, organizationId));

  const [invoicesCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId));

  const [totalExpenses] = await db
    .select({ total: sql<number>`COALESCE(sum(amount), 0)` })
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId));

  return {
    propertiesCount: propertiesCount.count,
    invoicesCount: invoicesCount.count,
    totalExpenses: totalExpenses.total,
  };
}

export async function getPlatformStats() {
  const db = await getDb();
  if (!db) return null;

  const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [orgsCount] = await db.select({ count: sql<number>`count(*)` }).from(organizations);
  const [propertiesCount] = await db.select({ count: sql<number>`count(*)` }).from(properties);
  const [invoicesCount] = await db.select({ count: sql<number>`count(*)` }).from(invoices);
  const [totalSeats] = await db.select({ total: sql<number>`COALESCE(sum(seats), 0)` }).from(subscriptions);
  const [totalRevenue] = await db.select({ total: sql<number>`COALESCE(sum(pricePerSeat * seats), 0)` }).from(subscriptions).where(eq(subscriptions.status, "active"));

  return {
    usersCount: usersCount.count,
    organizationsCount: orgsCount.count,
    propertiesCount: propertiesCount.count,
    invoicesCount: invoicesCount.count,
    totalSeats: totalSeats.total,
    totalRevenue: totalRevenue.total,
  };
}

// ============================================
// MAGIC LINK TOKENS
// ============================================

export async function createMagicLinkToken(token: InsertMagicLinkToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(magicLinkTokens).values(token);
  return result[0];
}

export async function getMagicLinkToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(magicLinkTokens)
    .where(eq(magicLinkTokens.token, token))
    .limit(1);
  return result[0];
}

export async function markMagicLinkTokenAsUsed(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(magicLinkTokens)
    .set({ usedAt: new Date() })
    .where(eq(magicLinkTokens.token, token));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values(user);
  return result[0];
}

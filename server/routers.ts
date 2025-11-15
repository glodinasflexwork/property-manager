import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { storagePut } from "./storage";

// Helper to generate random suffix for file keys
function randomSuffix() {
  return Math.random().toString(36).substring(2, 15);
}

// Helper to check if user has access to organization
async function checkOrganizationAccess(userId: number, organizationId: number) {
  const role = await db.getUserRole(userId, organizationId);
  if (!role) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this organization" });
  }
  return role;
}

// Helper to check if user can edit (owner, admin, or editor)
function canEdit(role: string) {
  return ["owner", "administrator", "editor"].includes(role);
}

// Helper to check if user is owner or admin
function isOwnerOrAdmin(role: string) {
  return ["owner", "administrator"].includes(role);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============================================
  // ORGANIZATIONS
  // ============================================
  organizations: router({
    // Get or create user's organization
    getOrCreate: protectedProcedure.query(async ({ ctx }) => {
      // Check if user already has an organization
      const orgs = await db.getOrganizationsByOwnerId(ctx.user.id);
      if (orgs.length > 0) {
        return orgs[0];
      }

      // Create new organization for user
      const orgId = await db.createOrganization({
        name: `${ctx.user.name}'s Portfolio`,
        ownerId: ctx.user.id,
      });

      // Add user as owner in team members
      await db.addTeamMember({
        organizationId: orgId,
        userId: ctx.user.id,
        role: "owner",
        invitedBy: ctx.user.id,
        acceptedAt: new Date(),
      });

      return db.getOrganizationById(orgId);
    }),

    // Get organization by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        await checkOrganizationAccess(ctx.user.id, input.id);
        return db.getOrganizationById(input.id);
      }),
  }),

  // ============================================
  // PROPERTIES
  // ============================================
  properties: router({
    // List all properties for organization
    list: protectedProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ ctx, input }) => {
        await checkOrganizationAccess(ctx.user.id, input.organizationId);
        const props = await db.getPropertiesByOrganization(input.organizationId);
        
        // Calculate profit/loss and ROI for each property
        return props.map(prop => {
          const profit = prop.salePrice ? prop.salePrice - prop.purchasePrice : 0;
          const roi = prop.salePrice ? ((profit / prop.purchasePrice) * 100) : 0;
          
          return {
            ...prop,
            profit,
            roi: Math.round(roi * 100) / 100, // Round to 2 decimals
          };
        });
      }),

    // Get single property with details
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const property = await db.getPropertyById(input.id);
        if (!property) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
        }
        
        await checkOrganizationAccess(ctx.user.id, property.organizationId);
        
        const profit = property.salePrice ? property.salePrice - property.purchasePrice : 0;
        const roi = property.salePrice ? ((profit / property.purchasePrice) * 100) : 0;
        
        return {
          ...property,
          profit,
          roi: Math.round(roi * 100) / 100,
        };
      }),

    // Create property
    create: protectedProcedure
      .input(z.object({
        organizationId: z.number(),
        streetName: z.string(),
        houseNumber: z.string(),
        addition: z.string().optional(),
        city: z.string(),
        province: z.string().optional(),
        postalCode: z.string(),
        purchasePrice: z.number(), // in cents
        purchaseDate: z.date(),
        salePrice: z.number().optional(),
        saleDate: z.date().optional(),
        status: z.enum(["owned", "sold", "rented", "reserved"]).default("owned"),
      }))
      .mutation(async ({ ctx, input }) => {
        const role = await checkOrganizationAccess(ctx.user.id, input.organizationId);
        if (!canEdit(role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to create properties" });
        }

        const id = await db.createProperty(input);
        return { id, success: true };
      }),

    // Update property
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        streetName: z.string().optional(),
        houseNumber: z.string().optional(),
        addition: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        postalCode: z.string().optional(),
        purchasePrice: z.number().optional(),
        purchaseDate: z.date().optional(),
        salePrice: z.number().optional(),
        saleDate: z.date().optional(),
        status: z.enum(["owned", "sold", "rented", "reserved"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const property = await db.getPropertyById(id);
        if (!property) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
        }

        const role = await checkOrganizationAccess(ctx.user.id, property.organizationId);
        if (!canEdit(role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to update properties" });
        }

        await db.updateProperty(id, updates);
        return { success: true };
      }),

    // Delete property
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const property = await db.getPropertyById(input.id);
        if (!property) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
        }

        const role = await checkOrganizationAccess(ctx.user.id, property.organizationId);
        if (!isOwnerOrAdmin(role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only owners and admins can delete properties" });
        }

        await db.deleteProperty(input.id);
        return { success: true };
      }),

    // Get property photos
    getPhotos: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const property = await db.getPropertyById(input.propertyId);
        if (!property) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
        }
        
        await checkOrganizationAccess(ctx.user.id, property.organizationId);
        return db.getPropertyPhotos(input.propertyId);
      }),

    // Upload property photo
    uploadPhoto: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        filename: z.string(),
        mimeType: z.string(),
        data: z.string(), // base64
      }))
      .mutation(async ({ ctx, input }) => {
        const property = await db.getPropertyById(input.propertyId);
        if (!property) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
        }

        const role = await checkOrganizationAccess(ctx.user.id, property.organizationId);
        if (!canEdit(role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to upload photos" });
        }

        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.data, "base64");
        const fileKey = `property-${input.propertyId}/photos/${input.filename}-${randomSuffix()}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Save to database
        const photoId = await db.addPropertyPhoto({
          propertyId: input.propertyId,
          url,
          fileKey,
          filename: input.filename,
          mimeType: input.mimeType,
          sortOrder: 0,
        });

        return { id: photoId, url, success: true };
      }),

    // Delete property photo
    deletePhoto: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Get photo to check property access
        const photos = await db.getPropertyPhotos(input.id);
        if (photos.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
        }

        const property = await db.getPropertyById(photos[0].propertyId);
        if (!property) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
        }

        const role = await checkOrganizationAccess(ctx.user.id, property.organizationId);
        if (!canEdit(role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to delete photos" });
        }

        await db.deletePropertyPhoto(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // INVOICES
  // ============================================
  invoices: router({
    // List invoices for organization
    list: protectedProcedure
      .input(z.object({ 
        organizationId: z.number(),
        propertyId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        await checkOrganizationAccess(ctx.user.id, input.organizationId);
        
        if (input.propertyId) {
          return db.getInvoicesByProperty(input.propertyId);
        }
        
        return db.getInvoicesByOrganization(input.organizationId);
      }),

    // Get single invoice
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const invoice = await db.getInvoiceById(input.id);
        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
        }
        
        await checkOrganizationAccess(ctx.user.id, invoice.organizationId);
        return invoice;
      }),

    // Create invoice
    create: protectedProcedure
      .input(z.object({
        organizationId: z.number(),
        propertyId: z.number(),
        category: z.enum(["repair", "renovation", "inspection", "legal", "other"]),
        title: z.string(),
        description: z.string().optional(),
        amount: z.number(), // in cents
        invoiceDate: z.date(),
        filename: z.string().optional(),
        mimeType: z.string().optional(),
        fileData: z.string().optional(), // base64
      }))
      .mutation(async ({ ctx, input }) => {
        const role = await checkOrganizationAccess(ctx.user.id, input.organizationId);
        if (!canEdit(role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to create invoices" });
        }

        let fileUrl: string | undefined;
        let fileKey: string | undefined;

        // Upload file if provided
        if (input.fileData && input.filename && input.mimeType) {
          const buffer = Buffer.from(input.fileData, "base64");
          fileKey = `invoices/${input.organizationId}/${input.filename}-${randomSuffix()}`;
          const result = await storagePut(fileKey, buffer, input.mimeType);
          fileUrl = result.url;
        }

        const id = await db.createInvoice({
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          category: input.category,
          title: input.title,
          description: input.description,
          amount: input.amount,
          invoiceDate: input.invoiceDate,
          fileUrl,
          fileKey,
          filename: input.filename,
          mimeType: input.mimeType,
          createdBy: ctx.user.id,
        });

        return { id, success: true };
      }),

    // Update invoice
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        category: z.enum(["repair", "renovation", "inspection", "legal", "other"]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        amount: z.number().optional(),
        invoiceDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const invoice = await db.getInvoiceById(id);
        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
        }

        const role = await checkOrganizationAccess(ctx.user.id, invoice.organizationId);
        if (!canEdit(role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to update invoices" });
        }

        await db.updateInvoice(id, updates);
        return { success: true };
      }),

    // Delete invoice
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const invoice = await db.getInvoiceById(input.id);
        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
        }

        const role = await checkOrganizationAccess(ctx.user.id, invoice.organizationId);
        if (!canEdit(role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to delete invoices" });
        }

        await db.deleteInvoice(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // BUDGETS
  // ============================================
  budgets: router({
    // List budgets for property
    list: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const property = await db.getPropertyById(input.propertyId);
        if (!property) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
        }
        
        await checkOrganizationAccess(ctx.user.id, property.organizationId);
        
        const budgets = await db.getBudgetsByProperty(input.propertyId);
        
        // Calculate actual spending for each budget
        const budgetsWithActual = await Promise.all(
          budgets.map(async (budget) => {
            const invoices = await db.getInvoicesByPropertyAndCategory(input.propertyId, budget.category);
            const actual = invoices.reduce((sum, inv) => sum + inv.amount, 0);
            const remaining = budget.budgetedAmount - actual;
            const status = remaining >= 0 ? "on_budget" : "over_budget";
            
            return {
              ...budget,
              actual,
              remaining,
              status,
            };
          })
        );
        
        return budgetsWithActual;
      }),

    // Create budget
    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        category: z.enum(["repair", "renovation", "inspection", "legal", "other"]),
        budgetedAmount: z.number(),
        year: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const property = await db.getPropertyById(input.propertyId);
        if (!property) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
        }

        const role = await checkOrganizationAccess(ctx.user.id, property.organizationId);
        if (!canEdit(role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to create budgets" });
        }

        const id = await db.createBudget(input);
        return { id, success: true };
      }),

    // Update budget
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        budgetedAmount: z.number().optional(),
        year: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateBudget(id, updates);
        return { success: true };
      }),

    // Delete budget
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteBudget(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // CASH FLOW
  // ============================================
  cashFlow: router({
    // Get cash flow for property
    list: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const property = await db.getPropertyById(input.propertyId);
        if (!property) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
        }
        
        await checkOrganizationAccess(ctx.user.id, property.organizationId);
        
        const flows = await db.getCashFlowByProperty(input.propertyId);
        
        // Calculate net cash flow for each month
        return flows.map(flow => {
          const totalExpenses = flow.mortgage + flow.propertyTax + flow.insurance + 
                               flow.maintenance + flow.hoaFees + flow.utilities + flow.other;
          const netCashFlow = flow.monthlyRent - totalExpenses;
          
          return {
            ...flow,
            totalExpenses,
            netCashFlow,
          };
        });
      }),

    // Upsert cash flow (create or update)
    upsert: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        year: z.number(),
        month: z.number().min(1).max(12),
        monthlyRent: z.number(),
        mortgage: z.number().default(0),
        propertyTax: z.number().default(0),
        insurance: z.number().default(0),
        maintenance: z.number().default(0),
        hoaFees: z.number().default(0),
        utilities: z.number().default(0),
        other: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const property = await db.getPropertyById(input.propertyId);
        if (!property) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
        }

        const role = await checkOrganizationAccess(ctx.user.id, property.organizationId);
        if (!canEdit(role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to manage cash flow" });
        }

        const id = await db.upsertCashFlow(input);
        return { id, success: true };
      }),
  }),

  // ============================================
  // INSIGHTS / ANALYTICS
  // ============================================
  insights: router({
    // Get organization overview
    overview: protectedProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ ctx, input }) => {
        await checkOrganizationAccess(ctx.user.id, input.organizationId);
        
        const stats = await db.getOrganizationStats(input.organizationId);
        const properties = await db.getPropertiesByOrganization(input.organizationId);
        
        // Calculate best and worst performing properties
        const propertiesWithMetrics = properties.map(prop => {
          const profit = prop.salePrice ? prop.salePrice - prop.purchasePrice : 0;
          const roi = prop.salePrice ? ((profit / prop.purchasePrice) * 100) : 0;
          return { ...prop, profit, roi };
        });
        
        const bestProperty = propertiesWithMetrics.reduce((best, current) => 
          current.roi > best.roi ? current : best, propertiesWithMetrics[0]);
        
        const worstProperty = propertiesWithMetrics.reduce((worst, current) => 
          current.roi < worst.roi ? current : worst, propertiesWithMetrics[0]);
        
        // Get cost breakdown by category
        const invoices = await db.getInvoicesByOrganization(input.organizationId);
        const costBreakdown = invoices.reduce((acc, invoice) => {
          acc[invoice.category] = (acc[invoice.category] || 0) + invoice.amount;
          return acc;
        }, {} as Record<string, number>);
        
        return {
          stats,
          bestProperty,
          worstProperty,
          costBreakdown,
        };
      }),
  }),

  // ============================================
  // TEAM MANAGEMENT
  // ============================================
  team: router({
    // List team members
    list: protectedProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ ctx, input }) => {
        await checkOrganizationAccess(ctx.user.id, input.organizationId);
        return db.getTeamMembersByOrganization(input.organizationId);
      }),

    // Get user's role in organization
    getMyRole: protectedProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getUserRole(ctx.user.id, input.organizationId);
      }),
  }),

  // ============================================
  // PLATFORM ADMIN (Owner only)
  // ============================================
  admin: router({
    // Get platform statistics
    stats: protectedProcedure.query(async ({ ctx }) => {
      // Only allow platform owner
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      
      return db.getPlatformStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;

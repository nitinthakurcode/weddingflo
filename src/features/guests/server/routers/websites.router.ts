import { router, adminProcedure, protectedProcedure, publicProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq, and, desc, isNull, ne, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

/**
 * Wedding Websites Router - Drizzle ORM
 *
 * Uses BetterAuth session for authorization
 * - ctx.companyId - from session
 * - ctx.db - Drizzle database client
 *
 * Schema uses:
 * - weddingWebsites table with: id, clientId, subdomain, customDomain, theme, published, password, isPasswordProtected, settings (JSONB), content (JSONB)
 * - content JSONB: heroSection, ourStorySection, eventDetailsSection, travelSection, registrySection, photoGallery, weddingPartySection
 * - settings JSONB: themeColors, fonts, metaTitle, metaDescription, ogImageUrl, customDomainVerified, dnsVerificationToken, viewCount, publishedAt
 */

// Type for content JSONB
interface WebsiteContent {
  heroSection?: Record<string, unknown>;
  ourStorySection?: Record<string, unknown>;
  weddingPartySection?: Record<string, unknown>;
  eventDetailsSection?: Record<string, unknown>;
  travelSection?: Record<string, unknown>;
  registrySection?: Record<string, unknown>;
  photoGallery?: unknown[];
}

// Type for settings JSONB
interface WebsiteSettings {
  themeColors?: Record<string, unknown>;
  fonts?: Record<string, unknown>;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  customDomainVerified?: boolean;
  dnsVerificationToken?: string;
  viewCount?: number;
  uniqueVisitors?: number;
  publishedAt?: string;
  dnsInstructions?: {
    type: string;
    name: string;
    value: string;
    txtRecord?: { name: string; value: string };
  };
}

export const websitesRouter = router({
  /**
   * List all websites for a company
   */
  list: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        });
      }

      // Get clients belonging to company first
      const companyClients = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.companyId, companyId),
            isNull(schema.clients.deletedAt)
          )
        );

      const clientIds = companyClients.map(c => c.id);

      if (clientIds.length === 0) {
        return [];
      }

      // Build conditions
      const conditions = [
        sql`${schema.weddingWebsites.clientId} IN (${sql.join(clientIds.map(id => sql`${id}`), sql`, `)})`,
        isNull(schema.weddingWebsites.deletedAt),
      ];

      if (input.clientId) {
        conditions.push(eq(schema.weddingWebsites.clientId, input.clientId));
      }

      const websites = await db
        .select()
        .from(schema.weddingWebsites)
        .where(and(...conditions))
        .orderBy(desc(schema.weddingWebsites.createdAt));

      return websites;
    }),

  /**
   * Get website by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        });
      }

      // Get website with client info
      const [website] = await db
        .select()
        .from(schema.weddingWebsites)
        .leftJoin(schema.clients, eq(schema.weddingWebsites.clientId, schema.clients.id))
        .where(
          and(
            eq(schema.weddingWebsites.id, input.id),
            eq(schema.clients.companyId, companyId)
          )
        )
        .limit(1);

      if (!website?.wedding_websites) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Website not found',
        });
      }

      return website.wedding_websites;
    }),

  /**
   * Get website by client ID
   */
  getByClient: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        });
      }

      // Verify client belongs to company
      const [client] = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, input.clientId),
            eq(schema.clients.companyId, companyId)
          )
        )
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied',
        });
      }

      const [website] = await db
        .select()
        .from(schema.weddingWebsites)
        .where(
          and(
            eq(schema.weddingWebsites.clientId, input.clientId),
            isNull(schema.weddingWebsites.deletedAt)
          )
        )
        .limit(1);

      return website || null;
    }),

  /**
   * Get website by subdomain (public access)
   */
  getBySubdomain: publicProcedure
    .input(z.object({
      subdomain: z.string(),
      password: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const [website] = await db
        .select()
        .from(schema.weddingWebsites)
        .where(
          and(
            eq(schema.weddingWebsites.subdomain, input.subdomain),
            eq(schema.weddingWebsites.published, true),
            isNull(schema.weddingWebsites.deletedAt)
          )
        )
        .limit(1);

      if (!website) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Website not found',
        });
      }

      // Check password protection
      if (website.isPasswordProtected && website.password) {
        if (!input.password) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Password required',
          });
        }

        const isValid = await bcrypt.compare(input.password, website.password);
        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid password',
          });
        }
      }

      // Don't expose password
      const { password, ...safeData } = website;
      return safeData;
    }),

  /**
   * Create new wedding website
   */
  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      subdomain: z.string().regex(/^[a-z0-9-]+$/).optional(),
      templateId: z.enum(['classic', 'modern', 'elegant', 'rustic', 'minimalist']).default('classic'),
      isPasswordProtected: z.boolean().default(false),
      password: z.string().min(6).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Verify client belongs to company
      const [client] = await db
        .select({
          id: schema.clients.id,
          partner1FirstName: schema.clients.partner1FirstName,
          partner1LastName: schema.clients.partner1LastName,
          partner2FirstName: schema.clients.partner2FirstName,
        })
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, input.clientId),
            eq(schema.clients.companyId, companyId)
          )
        )
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }

      // Generate subdomain if not provided
      let subdomain = input.subdomain;
      if (!subdomain) {
        const base = `${client.partner1FirstName || 'guest'}-${client.partner1LastName || 'website'}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        // Check if unique
        const [existing] = await db
          .select({ id: schema.weddingWebsites.id })
          .from(schema.weddingWebsites)
          .where(eq(schema.weddingWebsites.subdomain, base))
          .limit(1);

        if (existing) {
          subdomain = `${base}-${Date.now().toString(36)}`;
        } else {
          subdomain = base;
        }
      } else {
        // Check subdomain uniqueness if provided
        const [existing] = await db
          .select({ id: schema.weddingWebsites.id })
          .from(schema.weddingWebsites)
          .where(eq(schema.weddingWebsites.subdomain, subdomain))
          .limit(1);

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Subdomain already taken',
          });
        }
      }

      // Hash password if provided
      let passwordHash = null;
      if (input.isPasswordProtected && input.password) {
        passwordHash = await bcrypt.hash(input.password, 10);
      }

      // Create initial content
      const heroTitle = client.partner2FirstName
        ? `${client.partner1FirstName} & ${client.partner2FirstName}`
        : `${client.partner1FirstName} ${client.partner1LastName}`;

      const content: WebsiteContent = {
        heroSection: {
          title: heroTitle,
          subtitle: "We're getting married!",
        },
      };

      // Create website
      const [newWebsite] = await db
        .insert(schema.weddingWebsites)
        .values({
          clientId: input.clientId,
          subdomain,
          theme: input.templateId,
          isPasswordProtected: input.isPasswordProtected,
          password: passwordHash,
          content,
          settings: {},
        })
        .returning();

      return newWebsite;
    }),

  /**
   * Update website content
   */
  update: adminProcedure
    .input(z.object({
      websiteId: z.string().uuid().optional(),
      id: z.string().uuid().optional(),
      data: z.object({
        heroSection: z.any().optional(),
        ourStorySection: z.any().optional(),
        weddingPartySection: z.any().optional(),
        eventDetailsSection: z.any().optional(),
        travelSection: z.any().optional(),
        registrySection: z.any().optional(),
        photoGallery: z.any().optional(),
        themeColors: z.any().optional(),
        fonts: z.any().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        ogImageUrl: z.string().url().optional(),
        template_id: z.string().optional(),
      }).optional(),
      heroSection: z.any().optional(),
      ourStorySection: z.any().optional(),
      weddingPartySection: z.any().optional(),
      eventDetailsSection: z.any().optional(),
      travelSection: z.any().optional(),
      registrySection: z.any().optional(),
      photoGallery: z.any().optional(),
      themeColors: z.any().optional(),
      fonts: z.any().optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      ogImageUrl: z.string().url().optional(),
      template_id: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      const websiteId = input.websiteId || input.id;
      if (!websiteId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Website ID required',
        });
      }

      // Get current website (verify access)
      const [website] = await db
        .select()
        .from(schema.weddingWebsites)
        .leftJoin(schema.clients, eq(schema.weddingWebsites.clientId, schema.clients.id))
        .where(
          and(
            eq(schema.weddingWebsites.id, websiteId),
            eq(schema.clients.companyId, companyId)
          )
        )
        .limit(1);

      if (!website?.wedding_websites) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Website not found',
        });
      }

      // Merge data from both input formats
      const updates = input.data || input;
      const currentContent = (website.wedding_websites.content as WebsiteContent) || {};
      const currentSettings = (website.wedding_websites.settings as WebsiteSettings) || {};

      // Update content JSONB
      const newContent: WebsiteContent = { ...currentContent };
      if (updates.heroSection !== undefined) newContent.heroSection = updates.heroSection;
      if (updates.ourStorySection !== undefined) newContent.ourStorySection = updates.ourStorySection;
      if (updates.weddingPartySection !== undefined) newContent.weddingPartySection = updates.weddingPartySection;
      if (updates.eventDetailsSection !== undefined) newContent.eventDetailsSection = updates.eventDetailsSection;
      if (updates.travelSection !== undefined) newContent.travelSection = updates.travelSection;
      if (updates.registrySection !== undefined) newContent.registrySection = updates.registrySection;
      if (updates.photoGallery !== undefined) newContent.photoGallery = updates.photoGallery;

      // Update settings JSONB
      const newSettings: WebsiteSettings = { ...currentSettings };
      if (updates.themeColors !== undefined) newSettings.themeColors = updates.themeColors;
      if (updates.fonts !== undefined) newSettings.fonts = updates.fonts;
      if (updates.metaTitle !== undefined) newSettings.metaTitle = updates.metaTitle;
      if (updates.metaDescription !== undefined) newSettings.metaDescription = updates.metaDescription;
      if (updates.ogImageUrl !== undefined) newSettings.ogImageUrl = updates.ogImageUrl;

      // Update theme if provided
      const updateData: {
        content: WebsiteContent;
        settings: WebsiteSettings;
        updatedAt: Date;
        theme?: string;
      } = {
        content: newContent,
        settings: newSettings,
        updatedAt: new Date(),
      };

      if (updates.template_id) {
        updateData.theme = updates.template_id;
      }

      const [updatedWebsite] = await db
        .update(schema.weddingWebsites)
        .set(updateData)
        .where(eq(schema.weddingWebsites.id, websiteId))
        .returning();

      return updatedWebsite;
    }),

  /**
   * Toggle publish status
   */
  togglePublish: adminProcedure
    .input(z.object({
      websiteId: z.string().uuid().optional(),
      id: z.string().uuid().optional(),
      published: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      const websiteId = input.websiteId || input.id;
      if (!websiteId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Website ID required',
        });
      }

      // Verify access
      const [website] = await db
        .select()
        .from(schema.weddingWebsites)
        .leftJoin(schema.clients, eq(schema.weddingWebsites.clientId, schema.clients.id))
        .where(
          and(
            eq(schema.weddingWebsites.id, websiteId),
            eq(schema.clients.companyId, companyId)
          )
        )
        .limit(1);

      if (!website?.wedding_websites) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Website not found',
        });
      }

      // Update publish status and store publishedAt in settings
      const currentSettings = (website.wedding_websites.settings as WebsiteSettings) || {};
      const newSettings: WebsiteSettings = {
        ...currentSettings,
        publishedAt: input.published ? new Date().toISOString() : undefined,
      };

      const [updatedWebsite] = await db
        .update(schema.weddingWebsites)
        .set({
          published: input.published,
          settings: newSettings,
          updatedAt: new Date(),
        })
        .where(eq(schema.weddingWebsites.id, websiteId))
        .returning();

      return updatedWebsite;
    }),

  /**
   * Add custom domain (Premium feature)
   */
  addCustomDomain: adminProcedure
    .input(z.object({
      websiteId: z.string().uuid().optional(),
      id: z.string().uuid().optional(),
      domain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i).optional(),
      customDomain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      const websiteId = input.websiteId || input.id;
      const domain = input.domain || input.customDomain;

      if (!websiteId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Website ID required',
        });
      }

      if (!domain) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Domain required',
        });
      }

      // Check if domain is already in use
      const [existing] = await db
        .select({ id: schema.weddingWebsites.id })
        .from(schema.weddingWebsites)
        .where(
          and(
            eq(schema.weddingWebsites.customDomain, domain),
            ne(schema.weddingWebsites.id, websiteId)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Domain already in use',
        });
      }

      // Verify access
      const [website] = await db
        .select()
        .from(schema.weddingWebsites)
        .leftJoin(schema.clients, eq(schema.weddingWebsites.clientId, schema.clients.id))
        .where(
          and(
            eq(schema.weddingWebsites.id, websiteId),
            eq(schema.clients.companyId, companyId)
          )
        )
        .limit(1);

      if (!website?.wedding_websites) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Website not found',
        });
      }

      // Generate verification token
      const verificationToken = 'wf-verify-' + crypto.randomUUID().slice(0, 16);

      // Update settings with DNS info
      const currentSettings = (website.wedding_websites.settings as WebsiteSettings) || {};
      const newSettings: WebsiteSettings = {
        ...currentSettings,
        customDomainVerified: false,
        dnsVerificationToken: verificationToken,
        dnsInstructions: {
          type: 'CNAME',
          name: '@',
          value: 'websites.weddingflow.com',
          txtRecord: {
            name: '_weddingflow',
            value: verificationToken,
          },
        },
      };

      const [updatedWebsite] = await db
        .update(schema.weddingWebsites)
        .set({
          customDomain: domain,
          settings: newSettings,
          updatedAt: new Date(),
        })
        .where(eq(schema.weddingWebsites.id, websiteId))
        .returning();

      return {
        ...updatedWebsite,
        dnsInstructions: newSettings.dnsInstructions,
      };
    }),

  /**
   * Verify custom domain DNS configuration
   */
  verifyCustomDomain: adminProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Get website with settings
      const [website] = await db
        .select()
        .from(schema.weddingWebsites)
        .leftJoin(schema.clients, eq(schema.weddingWebsites.clientId, schema.clients.id))
        .where(
          and(
            eq(schema.weddingWebsites.id, input.websiteId),
            eq(schema.clients.companyId, companyId)
          )
        )
        .limit(1);

      if (!website?.wedding_websites) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Website not found',
        });
      }

      const settings = website.wedding_websites.settings as WebsiteSettings;
      if (!website.wedding_websites.customDomain || !settings?.dnsVerificationToken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No custom domain configured',
        });
      }

      try {
        // In production, use dns.promises.resolveTxt() here
        const dns = require('dns/promises');
        const txtRecordName = `_weddingflow.${website.wedding_websites.customDomain}`;

        try {
          const records = await dns.resolveTxt(txtRecordName);
          const flatRecords = records.flat();

          if (flatRecords.includes(settings.dnsVerificationToken)) {
            // Verification successful
            const newSettings: WebsiteSettings = {
              ...settings,
              customDomainVerified: true,
            };

            await db
              .update(schema.weddingWebsites)
              .set({
                settings: newSettings,
                updatedAt: new Date(),
              })
              .where(eq(schema.weddingWebsites.id, input.websiteId));

            return { verified: true, success: true };
          } else {
            return {
              verified: false,
              success: false,
              error: 'Verification token not found in DNS records',
            };
          }
        } catch (dnsError: unknown) {
          const errorMessage = dnsError instanceof Error ? dnsError.message : 'Unknown error';
          return {
            verified: false,
            success: false,
            error: `DNS lookup failed: ${errorMessage}. Please ensure DNS records are configured correctly.`,
          };
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          verified: false,
          success: false,
          error: errorMessage,
        };
      }
    }),

  /**
   * Track website visit (public)
   * Stores view count in settings JSONB (simplified without separate visits table)
   */
  trackVisit: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      pagePath: z.string(),
      referrer: z.string().optional(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get current website settings
      const [website] = await db
        .select({
          id: schema.weddingWebsites.id,
          settings: schema.weddingWebsites.settings,
        })
        .from(schema.weddingWebsites)
        .where(eq(schema.weddingWebsites.id, input.websiteId))
        .limit(1);

      if (website) {
        const settings = (website.settings as WebsiteSettings) || {};
        const newSettings: WebsiteSettings = {
          ...settings,
          viewCount: (settings.viewCount || 0) + 1,
        };

        await db
          .update(schema.weddingWebsites)
          .set({ settings: newSettings })
          .where(eq(schema.weddingWebsites.id, input.websiteId));
      }

      return { success: true };
    }),

  /**
   * Get analytics
   */
  getAnalytics: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      days: z.number().int().min(1).max(90).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Get website with settings
      const [website] = await db
        .select()
        .from(schema.weddingWebsites)
        .leftJoin(schema.clients, eq(schema.weddingWebsites.clientId, schema.clients.id))
        .where(
          and(
            eq(schema.weddingWebsites.id, input.websiteId),
            eq(schema.clients.companyId, companyId)
          )
        )
        .limit(1);

      if (!website?.wedding_websites) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Website not found',
        });
      }

      const settings = (website.wedding_websites.settings as WebsiteSettings) || {};

      return {
        totalViews: settings.viewCount || 0,
        uniqueVisitors: settings.uniqueVisitors || 0,
        visits: [], // No separate visits table in simplified schema
      };
    }),

  /**
   * Delete website
   */
  delete: adminProcedure
    .input(z.object({
      websiteId: z.string().uuid().optional(),
      id: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      const websiteId = input.websiteId || input.id;
      if (!websiteId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Website ID required',
        });
      }

      // Verify access
      const [website] = await db
        .select()
        .from(schema.weddingWebsites)
        .leftJoin(schema.clients, eq(schema.weddingWebsites.clientId, schema.clients.id))
        .where(
          and(
            eq(schema.weddingWebsites.id, websiteId),
            eq(schema.clients.companyId, companyId)
          )
        )
        .limit(1);

      if (!website?.wedding_websites) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Website not found',
        });
      }

      // Soft delete
      await db
        .update(schema.weddingWebsites)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.weddingWebsites.id, websiteId));

      return { success: true };
    }),
});

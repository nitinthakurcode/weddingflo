import { router, adminProcedure, protectedProcedure, publicProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Wedding Websites Router
 * Session 49: Guest Websites with custom domains
 *
 * Features:
 * - Free subdomain (john-jane.weddingflow.com)
 * - Custom domain ($19.99/year)
 * - 5 templates
 * - Password protection
 * - Analytics tracking
 * - RSVP integration
 */
export const websitesRouter = router({
  /**
   * List all websites for a company
   */
  list: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        });
      }

      const query = ctx.supabase
        .from('wedding_websites')
        .select('*')
        .eq('company_id', ctx.companyId)
        .order('created_at', { ascending: false });

      if (input.clientId) {
        query.eq('client_id', input.clientId);
      }

      const { data, error } = await query;

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data || [];
    }),

  /**
   * Get website by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        });
      }

      const { data, error } = await ctx.supabase
        .from('wedding_websites')
        .select('*')
        .eq('id', input.id)
        .eq('company_id', ctx.companyId)
        .maybeSingle();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      if (!data) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Website not found',
      });

      return data;
    }),

  /**
   * Get website by client ID
   */
  getByClient: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        });
      }

      const { data, error } = await ctx.supabase
        .from('wedding_websites')
        .select('*')
        .eq('client_id', input.clientId)
        .eq('company_id', ctx.companyId)
        .maybeSingle();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data;
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
      const { data, error } = await ctx.supabase
        .from('wedding_websites')
        .select('*')
        .eq('subdomain', input.subdomain)
        .eq('is_published', true)
        .maybeSingle();

      if (error || !data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Website not found',
        });
      }

      // Check password protection
      if (data.is_password_protected && data.password_hash) {
        if (!input.password) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Password required',
          });
        }

        const isValid = await bcrypt.compare(input.password, data.password_hash);
        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid password',
          });
        }
      }

      // Don't expose password hash
      const { password_hash, ...safeData } = data;
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
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Verify client belongs to company
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('partner1_first_name, partner1_last_name, partner2_first_name')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single();

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }

      // Generate subdomain if not provided
      let subdomain = input.subdomain;
      if (!subdomain) {
        // Use database function to generate unique subdomain
        const { data: generatedSubdomain } = await ctx.supabase.rpc(
          'generate_unique_subdomain',
          {
            p_partner1_first: client.partner1_first_name || 'guest',
            p_partner1_last: client.partner1_last_name || 'website',
          }
        );
        subdomain = generatedSubdomain as string;
      } else {
        // Check subdomain uniqueness if provided
        const { data: existing } = await ctx.supabase
          .from('wedding_websites')
          .select('id')
          .eq('subdomain', subdomain)
          .maybeSingle();

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

      // Create website with default hero section
      const { data, error } = await ctx.supabase
        .from('wedding_websites')
        .insert({
          client_id: input.clientId,
          company_id: ctx.companyId,
          subdomain,
          template_id: input.templateId,
          is_password_protected: input.isPasswordProtected,
          password_hash: passwordHash,
          hero_section: {
            title: client.partner2_first_name
              ? `${client.partner1_first_name} & ${client.partner2_first_name}`
              : `${client.partner1_first_name} ${client.partner1_last_name}`,
            subtitle: "We're getting married!",
          },
        })
        .select()
        .single();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data;
    }),

  /**
   * Update website content
   * Accepts either websiteId or id for backwards compatibility
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
      // Also accept flat structure for backwards compatibility
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
      if (!ctx.companyId) {
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

      // Merge data from both input formats
      const updates = input.data || input;

      const updateData: any = {};
      if (updates.heroSection !== undefined) updateData.hero_section = updates.heroSection;
      if (updates.ourStorySection !== undefined) updateData.our_story_section = updates.ourStorySection;
      if (updates.weddingPartySection !== undefined) updateData.wedding_party_section = updates.weddingPartySection;
      if (updates.eventDetailsSection !== undefined) updateData.event_details_section = updates.eventDetailsSection;
      if (updates.travelSection !== undefined) updateData.travel_section = updates.travelSection;
      if (updates.registrySection !== undefined) updateData.registry_section = updates.registrySection;
      if (updates.photoGallery !== undefined) updateData.photo_gallery = updates.photoGallery;
      if (updates.themeColors !== undefined) updateData.theme_colors = updates.themeColors;
      if (updates.fonts !== undefined) updateData.fonts = updates.fonts;
      if (updates.metaTitle !== undefined) updateData.meta_title = updates.metaTitle;
      if (updates.metaDescription !== undefined) updateData.meta_description = updates.metaDescription;
      if (updates.ogImageUrl !== undefined) updateData.og_image_url = updates.ogImageUrl;
      if (updates.template_id !== undefined) updateData.template_id = updates.template_id;

      const { data, error } = await ctx.supabase
        .from('wedding_websites')
        .update(updateData)
        .eq('id', websiteId)
        .eq('company_id', ctx.companyId)
        .select()
        .single();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data;
    }),

  /**
   * Toggle publish status
   * Accepts either websiteId or id for backwards compatibility
   */
  togglePublish: adminProcedure
    .input(z.object({
      websiteId: z.string().uuid().optional(),
      id: z.string().uuid().optional(),
      isPublished: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
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

      const { data, error } = await ctx.supabase
        .from('wedding_websites')
        .update({
          is_published: input.isPublished,
          published_at: input.isPublished ? new Date().toISOString() : null,
        })
        .eq('id', websiteId)
        .eq('company_id', ctx.companyId)
        .select()
        .single();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data;
    }),

  /**
   * Add custom domain (Premium feature)
   * Accepts either websiteId or id for backwards compatibility
   */
  addCustomDomain: adminProcedure
    .input(z.object({
      websiteId: z.string().uuid().optional(),
      id: z.string().uuid().optional(),
      domain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i).optional(),
      customDomain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
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
      const { data: existing } = await ctx.supabase
        .from('wedding_websites')
        .select('id')
        .eq('custom_domain', domain)
        .neq('id', websiteId)
        .maybeSingle();

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Domain already in use',
        });
      }

      // Generate verification token
      const verificationToken = 'wf-verify-' + crypto.randomUUID().slice(0, 16);

      const { data, error } = await ctx.supabase
        .from('wedding_websites')
        .update({
          custom_domain: domain,
          custom_domain_verified: false,
          dns_verification_token: verificationToken,
        })
        .eq('id', websiteId)
        .eq('company_id', ctx.companyId)
        .select()
        .single();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      // Create DNS record instructions
      await ctx.supabase.from('domain_dns_records').insert([
        {
          website_id: websiteId,
          record_type: 'TXT',
          record_name: '_weddingflow',
          record_value: verificationToken,
          instructions: `Add a TXT record with name "_weddingflow" and value "${verificationToken}"`,
        },
        {
          website_id: websiteId,
          record_type: 'CNAME',
          record_name: '@',
          record_value: 'websites.weddingflow.com',
          instructions: 'Add a CNAME record for "@" pointing to "websites.weddingflow.com"',
        },
      ]);

      return {
        ...data,
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
    }),

  /**
   * Verify custom domain DNS configuration
   */
  verifyCustomDomain: adminProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Get website with verification token
      const { data: website } = await ctx.supabase
        .from('wedding_websites')
        .select('custom_domain, dns_verification_token')
        .eq('id', input.websiteId)
        .eq('company_id', ctx.companyId)
        .single();

      if (!website || !website.custom_domain || !website.dns_verification_token) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No custom domain configured',
        });
      }

      try {
        // In production, you would use dns.promises.resolveTxt() here
        // For now, we'll simulate the verification
        const dns = require('dns/promises');
        const txtRecordName = `_weddingflow.${website.custom_domain}`;

        try {
          const records = await dns.resolveTxt(txtRecordName);
          const flatRecords = records.flat();

          if (flatRecords.includes(website.dns_verification_token)) {
            // Verification successful
            await ctx.supabase
              .from('wedding_websites')
              .update({ custom_domain_verified: true })
              .eq('id', input.websiteId);

            await ctx.supabase
              .from('domain_dns_records')
              .update({
                verified: true,
                verified_at: new Date().toISOString(),
              })
              .eq('website_id', input.websiteId)
              .eq('record_type', 'TXT');

            return { verified: true, success: true };
          } else {
            return {
              verified: false,
              success: false,
              error: 'Verification token not found in DNS records',
            };
          }
        } catch (dnsError: any) {
          return {
            verified: false,
            success: false,
            error: `DNS lookup failed: ${dnsError.message}. Please ensure DNS records are configured correctly.`,
          };
        }
      } catch (error: any) {
        return {
          verified: false,
          success: false,
          error: error.message,
        };
      }
    }),

  /**
   * Track website visit (public)
   */
  trackVisit: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      pagePath: z.string(),
      referrer: z.string().optional(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Hash IP for privacy (if available)
      const ipHash = input.referrer
        ? crypto.createHash('sha256').update(input.referrer).digest('hex').substring(0, 16)
        : null;

      // Insert visit record
      await ctx.supabase.from('website_visits').insert({
        website_id: input.websiteId,
        visitor_ip: ipHash,
        page_path: input.pagePath,
        referrer: input.referrer,
        session_id: input.sessionId,
      });

      // Increment view count (fetch current, increment, update)
      const { data: website } = await ctx.supabase
        .from('wedding_websites')
        .select('view_count')
        .eq('id', input.websiteId)
        .single();

      if (website) {
        await ctx.supabase
          .from('wedding_websites')
          .update({ view_count: website.view_count + 1 })
          .eq('id', input.websiteId);
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
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Get website stats
      const { data: website } = await ctx.supabase
        .from('wedding_websites')
        .select('view_count, unique_visitors')
        .eq('id', input.websiteId)
        .eq('company_id', ctx.companyId)
        .single();

      // Get visit data
      const cutoffDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000).toISOString();
      const { data: visits } = await ctx.supabase
        .from('website_visits')
        .select('*')
        .eq('website_id', input.websiteId)
        .gte('visited_at', cutoffDate)
        .order('visited_at', { ascending: false });

      return {
        totalViews: website?.view_count || 0,
        uniqueVisitors: website?.unique_visitors || 0,
        visits: visits || [],
      };
    }),

  /**
   * Delete website
   * Accepts either websiteId or id for backwards compatibility
   */
  delete: adminProcedure
    .input(z.object({
      websiteId: z.string().uuid().optional(),
      id: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
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

      const { error } = await ctx.supabase
        .from('wedding_websites')
        .delete()
        .eq('id', websiteId)
        .eq('company_id', ctx.companyId);

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return { success: true };
    }),
});

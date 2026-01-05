import { z } from 'zod';

export const subscriptionTierSchema = z.enum(['starter', 'professional', 'enterprise']);

export const subscriptionStatusSchema = z.enum(['active', 'trial', 'past_due', 'canceled']);

export const brandingSchema = z.object({
  logo_url: z.string().url('Invalid logo URL').optional(),
  app_icon_url: z.string().url('Invalid app icon URL').optional(),
  primary_color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (use #RRGGBB)')
    .optional()
    .default('#3b82f6'),
  secondary_color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (use #RRGGBB)')
    .optional()
    .default('#8b5cf6'),
  accent_color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (use #RRGGBB)')
    .optional()
    .default('#ec4899'),
  font_family: z.string().optional().default('Inter'),
  custom_css: z.string().optional(),
});

export const aiConfigSchema = z.object({
  enabled: z.boolean().optional().default(true),
  seating_ai_enabled: z.boolean().optional().default(true),
  budget_predictions_enabled: z.boolean().optional().default(true),
  auto_timeline_enabled: z.boolean().optional().default(true),
  email_assistant_enabled: z.boolean().optional().default(true),
  voice_assistant_enabled: z.boolean().optional().default(false),
});

export const subscriptionSchema = z.object({
  tier: subscriptionTierSchema.optional().default('starter'),
  status: subscriptionStatusSchema.optional().default('trial'),
  trial_ends_at: z.number().optional(),
  billing_cycle: z.string().optional().default('monthly'),
});

export const usageStatsSchema = z.object({
  total_weddings: z.number().min(0).optional().default(0),
  active_weddings: z.number().min(0).optional().default(0),
  total_guests: z.number().min(0).optional().default(0),
  storage_used_mb: z.number().min(0).optional().default(0),
  ai_queries_this_month: z.number().min(0).optional().default(0),
});

export const companySchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  subdomain: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
  custom_domain: z.string().optional(),
  branding: brandingSchema.optional(),
  ai_config: aiConfigSchema.optional(),
  subscription: subscriptionSchema.optional(),
  usage_stats: usageStatsSchema.optional(),
});

export const updateCompanySchema = companySchema.partial();

export const updateBrandingSchema = brandingSchema.partial();

export const updateAiConfigSchema = aiConfigSchema.partial();

export const updateSubscriptionSchema = subscriptionSchema.partial();

export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type Branding = z.input<typeof brandingSchema>;
export type AiConfig = z.input<typeof aiConfigSchema>;
export type Subscription = z.input<typeof subscriptionSchema>;
export type UsageStats = z.input<typeof usageStatsSchema>;
export type CompanyFormData = z.input<typeof companySchema>;
export type UpdateCompanyData = z.infer<typeof updateCompanySchema>;
export type UpdateBrandingData = z.infer<typeof updateBrandingSchema>;
export type UpdateAiConfigData = z.infer<typeof updateAiConfigSchema>;
export type UpdateSubscriptionData = z.infer<typeof updateSubscriptionSchema>;

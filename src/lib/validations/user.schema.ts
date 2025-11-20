import { z } from 'zod';

export const userRoleSchema = z.enum([
  'super_admin',
  'company_admin',
  'staff',
  'client_user',
]);

export const themeSchema = z.enum(['light', 'dark', 'auto']);

export const emailDigestSchema = z.enum(['daily', 'weekly', 'never']);

export const userPreferencesSchema = z.object({
  theme: themeSchema.default('auto'),
  notifications_enabled: z.boolean().default(true),
  email_digest: emailDigestSchema.default('weekly'),
  language: z.string().default('en'),
  timezone: z.string().default('America/New_York'),
});

export const userSchema = z.object({
  clerk_id: z.string().min(1, 'Clerk ID is required'),
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  avatar_url: z.string().url('Invalid URL').optional(),
  company_id: z.string().min(1, 'Company ID is required'),
  role: userRoleSchema.default('client_user'),
  preferences: userPreferencesSchema.default({}),
});

export const updateUserSchema = userSchema.partial().omit({ clerk_id: true });

export const updateUserPreferencesSchema = userPreferencesSchema.partial();

export type UserRole = z.infer<typeof userRoleSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type EmailDigest = z.infer<typeof emailDigestSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type UpdateUserPreferencesData = z.infer<typeof updateUserPreferencesSchema>;

import { z } from 'zod';

export const generateICalTokenSchema = z.object({
  userId: z.string(),
  companyId: z.string().uuid(),
});

export const getICalFeedSchema = z.object({
  token: z.string().length(64),
});

export const updateICalSettingsSchema = z.object({
  icalFeedEnabled: z.boolean().optional(),
  icalIncludeEvents: z.boolean().optional(),
  icalIncludeTimeline: z.boolean().optional(),
  icalIncludeTasks: z.boolean().optional(),
});

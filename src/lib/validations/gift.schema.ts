import { z } from "zod";

/**
 * Gift Form Schema - December 2025 Standard
 *
 * Aligned with gifts router expected fields (Drizzle ORM)
 */
export const giftSchema = z.object({
  giftName: z.string().min(1, "Gift name is required"),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional().or(z.literal('')),
  deliveryDate: z.string().optional(),
  deliveryStatus: z.enum(["pending", "received", "returned"]).optional().default("pending"),
  thankYouSent: z.boolean().optional().default(false),
  thankYouSentDate: z.string().optional(),
  notes: z.string().optional(),
});

export type GiftFormData = z.input<typeof giftSchema>;

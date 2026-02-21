import { z } from "zod";

/**
 * Gift Form Schema
 * Matches actual gifts table: id, clientId, guestId, name, value, status, createdAt, updatedAt
 */
export const giftSchema = z.object({
  name: z.string().min(1, "Gift name is required"),
  value: z.string().optional(),
  status: z.enum(["pending", "received", "returned"]).default("received"),
});

export type GiftFormData = z.input<typeof giftSchema>;

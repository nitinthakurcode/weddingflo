import { z } from "zod";

export const giftSchema = z.object({
  guestId: z.string().optional(),
  guestName: z.string().min(1, "Guest name is required"),
  description: z.string().min(1, "Gift description is required"),
  category: z.string().optional(),
  estimatedValue: z.number().min(0, "Value must be positive").optional(),
  receivedDate: z.string().min(1, "Received date is required"),
  deliveryStatus: z.enum(["pending", "in_transit", "delivered", "returned"]).default("pending"),
  deliveryTrackingNumber: z.string().optional(),
  deliveryNotes: z.string().optional(),
  thankYouStatus: z.enum(["not_sent", "draft", "sent"]).default("not_sent"),
  thankYouSentDate: z.string().optional(),
  thankYouNotes: z.string().optional(),
  photoStorageId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type GiftFormData = z.infer<typeof giftSchema>;

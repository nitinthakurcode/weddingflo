import { z } from "zod";

const vendorPaymentSchema = z.object({
  id: z.string(),
  amount: z.number().min(0, "Amount must be positive"),
  dueDate: z.string().min(1, "Due date is required"),
  paidDate: z.string().optional(),
  status: z.enum(["unpaid", "partial", "paid"]),
  method: z.string().optional(),
  notes: z.string().optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  category: z.enum([
    "venue",
    "catering",
    "photography",
    "videography",
    "florist",
    "music",
    "decor",
    "transportation",
    "stationery",
    "hair_makeup",
    "attire",
    "cake",
    "other",
  ]),
  contactName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().optional(),
  status: z.enum(["prospect", "contacted", "quoted", "booked", "confirmed", "completed", "cancelled"]).default("prospect"),
  contractDate: z.string().optional(),
  serviceDate: z.string().optional(),
  totalCost: z.number().min(0, "Total cost must be positive"),
  depositAmount: z.number().min(0, "Deposit amount must be positive").optional(),
  depositPaidDate: z.string().optional(),
  balance: z.number().min(0, "Balance must be positive").optional(),
  payments: z.array(vendorPaymentSchema).default([]),
  budgetItemId: z.string().optional(),
  contractStorageId: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  performanceNotes: z.string().optional(),
  wouldRecommend: z.boolean().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const paymentSchema = z.object({
  amount: z.number().min(0, "Amount must be positive"),
  dueDate: z.string().min(1, "Due date is required"),
  paidDate: z.string().optional(),
  status: z.enum(["unpaid", "partial", "paid"]),
  method: z.string().optional(),
  notes: z.string().optional(),
});

export type VendorFormData = z.infer<typeof vendorSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;

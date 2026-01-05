// Drizzle ORM types
export type VendorCategory =
  | "venue"
  | "catering"
  | "photography"
  | "videography"
  | "florist"
  | "music"
  | "decor"
  | "transportation"
  | "stationery"
  | "hair_makeup"
  | "attire"
  | "cake"
  | "other";

export type VendorStatus = "prospect" | "contacted" | "quoted" | "booked" | "confirmed" | "completed" | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface VendorPayment {
  id: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  method?: string;
  notes?: string;
}

export interface Vendor {
  id: string; // UUID
  created_at: string;
  weddingId: string;
  name: string;
  category: VendorCategory;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  status: VendorStatus;
  contractDate?: string;
  serviceDate?: string;
  totalCost: number;
  depositAmount?: number;
  depositPaidDate?: string;
  balance?: number;
  payments: VendorPayment[];
  budgetItemId?: string; // UUID
  contractUrl?: string;
  contractStorageId?: string; // UUID
  rating?: number;
  performanceNotes?: string;
  wouldRecommend?: boolean;
  notes?: string;
  tags?: string[];
  // Advance payment tracking (synced from budget)
  totalAdvances?: number;
  balanceRemaining?: number;
}

export interface CreateVendorInput {
  name: string;
  category: VendorCategory;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  status?: VendorStatus;
  contractDate?: string;
  serviceDate?: string;
  totalCost: number;
  depositAmount?: number;
  depositPaidDate?: string;
  balance?: number;
  payments?: VendorPayment[];
  budgetItemId?: string; // UUID
  contractStorageId?: string; // UUID
  rating?: number;
  performanceNotes?: string;
  wouldRecommend?: boolean;
  notes?: string;
  tags?: string[];
}

export interface UpdateVendorInput extends Partial<CreateVendorInput> {
  id: string; // UUID
}

export interface VendorStats {
  totalVendors: number;
  confirmedVendors: number;
  totalValue: number;
  totalPaid: number;
  totalOutstanding: number;
  byCategory: Record<VendorCategory, number>;
}

export const VENDOR_CATEGORIES: { value: VendorCategory; label: string; icon: string }[] = [
  { value: "venue", label: "Venue", icon: "Building" },
  { value: "catering", label: "Catering", icon: "Utensils" },
  { value: "photography", label: "Photography", icon: "Camera" },
  { value: "videography", label: "Videography", icon: "Video" },
  { value: "florist", label: "Florist", icon: "Flower" },
  { value: "music", label: "Music/DJ", icon: "Music" },
  { value: "decor", label: "Decor", icon: "Sparkles" },
  { value: "transportation", label: "Transportation", icon: "Car" },
  { value: "stationery", label: "Stationery", icon: "FileText" },
  { value: "hair_makeup", label: "Hair & Makeup", icon: "Brush" },
  { value: "attire", label: "Attire", icon: "Shirt" },
  { value: "cake", label: "Cake", icon: "Cake" },
  { value: "other", label: "Other", icon: "MoreHorizontal" },
];

export const VENDOR_STATUS_OPTIONS: { value: VendorStatus; label: string; color: string }[] = [
  { value: "prospect", label: "Prospect", color: "gray" },
  { value: "contacted", label: "Contacted", color: "blue" },
  { value: "quoted", label: "Quoted", color: "purple" },
  { value: "booked", label: "Booked", color: "yellow" },
  { value: "confirmed", label: "Confirmed", color: "green" },
  { value: "completed", label: "Completed", color: "teal" },
  { value: "cancelled", label: "Cancelled", color: "red" },
];

export const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string; color: string }[] = [
  { value: "unpaid", label: "Unpaid", color: "red" },
  { value: "partial", label: "Partial", color: "yellow" },
  { value: "paid", label: "Paid", color: "green" },
];

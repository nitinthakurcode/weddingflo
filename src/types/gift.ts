import { Id } from "../../convex/_generated/dataModel";

export type DeliveryStatus = "pending" | "in_transit" | "delivered" | "returned";
export type ThankYouStatus = "not_sent" | "draft" | "sent";

export interface Gift {
  _id: Id<"gifts">;
  _creationTime: number;
  weddingId: Id<"weddings">;
  guestId?: Id<"guests">;
  guestName: string;
  description: string;
  category?: string;
  estimatedValue?: number;
  receivedDate: string;
  deliveryStatus: DeliveryStatus;
  deliveryTrackingNumber?: string;
  deliveryNotes?: string;
  thankYouStatus: ThankYouStatus;
  thankYouSentDate?: string;
  thankYouNotes?: string;
  photoUrl?: string;
  photoStorageId?: Id<"_storage">;
  tags?: string[];
  notes?: string;
}

export interface CreateGiftInput {
  guestId?: Id<"guests">;
  guestName: string;
  description: string;
  category?: string;
  estimatedValue?: number;
  receivedDate: string;
  deliveryStatus?: DeliveryStatus;
  deliveryTrackingNumber?: string;
  deliveryNotes?: string;
  thankYouStatus?: ThankYouStatus;
  thankYouSentDate?: string;
  thankYouNotes?: string;
  photoStorageId?: Id<"_storage">;
  tags?: string[];
  notes?: string;
}

export interface UpdateGiftInput extends Partial<CreateGiftInput> {
  _id: Id<"gifts">;
}

export interface GiftStats {
  totalGifts: number;
  deliveredGifts: number;
  thankYousSent: number;
  pendingThankYous: number;
  totalValue: number;
}

export const GIFT_CATEGORIES = [
  "Kitchenware",
  "Home Decor",
  "Bedding & Bath",
  "Electronics",
  "Furniture",
  "Cash/Check",
  "Gift Card",
  "Experience",
  "Other",
] as const;

export const DELIVERY_STATUS_OPTIONS: { value: DeliveryStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "yellow" },
  { value: "in_transit", label: "In Transit", color: "blue" },
  { value: "delivered", label: "Delivered", color: "green" },
  { value: "returned", label: "Returned", color: "red" },
];

export const THANK_YOU_STATUS_OPTIONS: { value: ThankYouStatus; label: string; color: string }[] = [
  { value: "not_sent", label: "Not Sent", color: "gray" },
  { value: "draft", label: "Draft", color: "yellow" },
  { value: "sent", label: "Sent", color: "green" },
];

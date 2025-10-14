import { Id } from '@/convex/_generated/dataModel';

export type CreativeType =
  | 'invitation'
  | 'save_the_date'
  | 'program'
  | 'menu'
  | 'place_card'
  | 'table_number'
  | 'signage'
  | 'thank_you_card'
  | 'website'
  | 'photo_album'
  | 'video'
  | 'other';

export type CreativeStatus =
  | 'pending'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'completed'
  | 'cancelled';

export interface CreativeJob {
  _id: Id<'creative_jobs'>;
  weddingId: Id<'weddings'>;
  type: CreativeType;
  title: string;
  description?: string;
  status: CreativeStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  vendor_id?: Id<'vendors'>;
  due_date?: string;
  completed_date?: string;
  progress: number; // 0-100
  budget?: number;
  actual_cost?: number;
  files: CreativeFile[];
  feedback?: string;
  notes?: string;
  created_at: number;
  updated_at: number;
}

export interface CreativeFile {
  id: string;
  name: string;
  type: string; // mime type
  size: number;
  storage_id?: Id<'_storage'>;
  url?: string;
  thumbnail_url?: string;
  uploaded_at: number;
  version: number;
}

export interface CreativeStats {
  total: number;
  pending: number;
  in_progress: number;
  review: number;
  approved: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

export const CREATIVE_TYPES: Record<CreativeType, string> = {
  invitation: 'Invitation',
  save_the_date: 'Save the Date',
  program: 'Program',
  menu: 'Menu',
  place_card: 'Place Card',
  table_number: 'Table Number',
  signage: 'Signage',
  thank_you_card: 'Thank You Card',
  website: 'Website',
  photo_album: 'Photo Album',
  video: 'Video',
  other: 'Other',
};

export const CREATIVE_STATUS_LABELS: Record<CreativeStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  review: 'Under Review',
  approved: 'Approved',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const CREATIVE_STATUS_COLORS: Record<CreativeStatus, string> = {
  pending: 'bg-gray-200 text-gray-700',
  in_progress: 'bg-blue-200 text-blue-700',
  review: 'bg-yellow-200 text-yellow-700',
  approved: 'bg-green-200 text-green-700',
  completed: 'bg-purple-200 text-purple-700',
  cancelled: 'bg-red-200 text-red-700',
};

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

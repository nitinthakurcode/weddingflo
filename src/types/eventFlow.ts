// Supabase types - no Convex dependencies

export type ActivityType =
  | 'setup'
  | 'ceremony'
  | 'reception'
  | 'entertainment'
  | 'break'
  | 'photography'
  | 'catering'
  | 'cleanup'
  | 'other';

export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ActivityDependency {
  activity_id: string; // UUID
  type: 'must_finish_before' | 'must_start_after' | 'must_overlap';
}

export interface Conflict {
  id: string;
  type: 'time_overlap' | 'vendor_double_booking' | 'location_conflict' | 'dependency_violation';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affected_activities: string[]; // UUID
  suggested_resolution?: string;
}

export interface EventActivity {
  id: string; // UUID
  created_at: string;
  company_id: string; // UUID
  client_id: string; // UUID
  event_id?: string; // UUID
  date: number;
  activity: string;
  activity_type: string;
  activity_description?: string;
  start_time: string;
  duration_minutes: number;
  end_time: string;
  buffer_minutes?: number;
  event: string;
  location: string;
  manager: string;
  responsible_vendor?: string; // UUID
  order: number;
  depends_on: string[]; // UUID
  blocks: string[]; // UUID
  ai_optimized: boolean;
  ai_suggested_start_time?: string;
  ai_conflict_detected: boolean;
  ai_suggestions: string[];
  status: 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'delayed';
  notes?: string;
  updated_at: string;
}

export interface ActivityFormData {
  activity_name: string;
  activity_type: ActivityType;
  activity_status: ActivityStatus;
  start_time: string;
  duration_minutes: number;
  vendor_ids: string[]; // UUID
  location?: string;
  assigned_to?: string[];
  dependencies: ActivityDependency[];
  time_buffer_minutes: number;
  color?: string;
  description?: string;
  notes?: string;
}

export interface TimelineView {
  zoom_level: 'hour' | 'half_hour' | 'quarter_hour';
  start_hour: number;
  end_hour: number;
  show_grid: boolean;
  show_dependencies: boolean;
  show_conflicts: boolean;
}

export interface TimeBlock {
  id: string;
  activity_id: string; // UUID
  start_time: Date;
  end_time: Date;
  left_percent: number;
  width_percent: number;
  has_conflict: boolean;
}

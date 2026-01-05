// Drizzle ORM types

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

/**
 * Sort parameters
 */
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Filter operator types
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith' | 'endsWith';

/**
 * Generic filter
 */
export interface Filter {
  field: string;
  operator: FilterOperator;
  value: any;
}

/**
 * Query parameters with pagination, sorting, and filtering
 */
export interface QueryParams {
  pagination?: PaginationParams;
  sort?: SortParams;
  filters?: Filter[];
  search?: string;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  url: string;
  storageId: string; // UUID
  filename: string;
  size: number;
  mimeType: string;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult<T = any> {
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
    data?: T;
  }>;
}

/**
 * Loading state
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Async data state
 */
export interface AsyncData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Form submission state
 */
export interface FormState {
  isSubmitting: boolean;
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Date range
 */
export interface DateRange {
  from: Date | number;
  to: Date | number;
}

/**
 * Coordinates
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Address
 */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  coordinates?: Coordinates;
}

/**
 * Time range
 */
export interface TimeRange {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

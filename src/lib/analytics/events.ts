import { posthog } from './posthog-client';

/**
 * Track user signup
 */
export function trackUserSignup(userId: string, email: string, method: string) {
  posthog.capture('user_signed_up', {
    user_id: userId,
    email,
    signup_method: method,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track user login
 */
export function trackUserLogin(userId: string, method: string) {
  posthog.capture('user_logged_in', {
    user_id: userId,
    login_method: method,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Guest Management Events
 */
export const GuestEvents = {
  created: (guestId: string, totalGuests: number) => {
    posthog.capture('guest_created', {
      guest_id: guestId,
      total_guests: totalGuests,
    });
  },

  updated: (guestId: string, fieldsChanged: string[]) => {
    posthog.capture('guest_updated', {
      guest_id: guestId,
      fields_changed: fieldsChanged,
    });
  },

  deleted: (guestId: string, totalGuests: number) => {
    posthog.capture('guest_deleted', {
      guest_id: guestId,
      total_guests: totalGuests,
    });
  },

  imported: (count: number, source: 'excel' | 'csv' | 'manual') => {
    posthog.capture('guests_imported', {
      count,
      source,
    });
  },

  exported: (count: number, format: 'pdf' | 'excel' | 'csv') => {
    posthog.capture('guests_exported', {
      count,
      format,
    });
  },
};

/**
 * Vendor Management Events
 */
export const VendorEvents = {
  added: (vendorId: string, category: string) => {
    posthog.capture('vendor_added', {
      vendor_id: vendorId,
      category,
    });
  },

  updated: (vendorId: string, category: string) => {
    posthog.capture('vendor_updated', {
      vendor_id: vendorId,
      category,
    });
  },

  deleted: (vendorId: string, category: string) => {
    posthog.capture('vendor_deleted', {
      vendor_id: vendorId,
      category,
    });
  },

  contacted: (vendorId: string, method: 'email' | 'phone' | 'sms') => {
    posthog.capture('vendor_contacted', {
      vendor_id: vendorId,
      contact_method: method,
    });
  },
};

/**
 * Budget Events
 */
export const BudgetEvents = {
  itemCreated: (itemId: string, category: string, amount: number) => {
    posthog.capture('budget_item_created', {
      item_id: itemId,
      category,
      amount,
    });
  },

  itemUpdated: (itemId: string, category: string, newAmount: number) => {
    posthog.capture('budget_item_updated', {
      item_id: itemId,
      category,
      new_amount: newAmount,
    });
  },

  itemPaid: (itemId: string, category: string, amount: number) => {
    posthog.capture('budget_item_paid', {
      item_id: itemId,
      category,
      amount,
    });
  },

  exceeded: (totalBudget: number, totalSpent: number) => {
    posthog.capture('budget_exceeded', {
      total_budget: totalBudget,
      total_spent: totalSpent,
      overage: totalSpent - totalBudget,
    });
  },
};

/**
 * Event (Wedding Event) Management
 */
export const EventEvents = {
  created: (eventId: string, eventType: string, date: string) => {
    posthog.capture('event_created', {
      event_id: eventId,
      event_type: eventType,
      event_date: date,
    });
  },

  updated: (eventId: string, fieldsChanged: string[]) => {
    posthog.capture('event_updated', {
      event_id: eventId,
      fields_changed: fieldsChanged,
    });
  },

  deleted: (eventId: string, eventType: string) => {
    posthog.capture('event_deleted', {
      event_id: eventId,
      event_type: eventType,
    });
  },
};

/**
 * QR Code Events
 */
export const QREvents = {
  generated: (count: number, type: 'individual' | 'bulk') => {
    posthog.capture('qr_codes_generated', {
      count,
      type,
    });
  },

  scanned: (guestId: string, location?: string) => {
    posthog.capture('qr_code_scanned', {
      guest_id: guestId,
      location,
    });
  },

  downloaded: (count: number, format: 'pdf' | 'png' | 'zip') => {
    posthog.capture('qr_codes_downloaded', {
      count,
      format,
    });
  },
};

/**
 * AI Feature Events
 */
export const AIEvents = {
  seatingGenerated: (
    guestCount: number,
    tableCount: number,
    duration: number,
    success: boolean
  ) => {
    posthog.capture('ai_seating_generated', {
      guest_count: guestCount,
      table_count: tableCount,
      duration_ms: duration,
      success,
    });
  },

  budgetSuggested: (categoryCount: number, totalSuggested: number) => {
    posthog.capture('ai_budget_suggested', {
      category_count: categoryCount,
      total_suggested: totalSuggested,
    });
  },

  vendorRecommended: (location: string, count: number, category: string) => {
    posthog.capture('ai_vendor_recommended', {
      location,
      recommendation_count: count,
      category,
    });
  },

  assistantUsed: (query: string, context: string) => {
    posthog.capture('ai_assistant_used', {
      query_length: query.length,
      context,
    });
  },
};

/**
 * Export Events
 */
export const ExportEvents = {
  pdfGenerated: (type: string, pageCount: number) => {
    posthog.capture('pdf_generated', {
      type,
      page_count: pageCount,
    });
  },

  excelExported: (type: string, rowCount: number) => {
    posthog.capture('excel_exported', {
      type,
      row_count: rowCount,
    });
  },

  dataExported: (format: 'csv' | 'json' | 'excel', recordCount: number) => {
    posthog.capture('data_exported', {
      format,
      record_count: recordCount,
    });
  },
};

/**
 * Payment Events
 */
export const PaymentEvents = {
  initiated: (plan: string, amount: number) => {
    posthog.capture('payment_initiated', {
      plan,
      amount,
    });
  },

  completed: (plan: string, amount: number, transactionId: string) => {
    posthog.capture('payment_completed', {
      plan,
      amount,
      transaction_id: transactionId,
    });
  },

  failed: (plan: string, amount: number, error: string) => {
    posthog.capture('payment_failed', {
      plan,
      amount,
      error,
    });
  },

  upgraded: (fromPlan: string, toPlan: string) => {
    posthog.capture('subscription_upgraded', {
      from_plan: fromPlan,
      to_plan: toPlan,
    });
  },

  downgraded: (fromPlan: string, toPlan: string) => {
    posthog.capture('subscription_downgraded', {
      from_plan: fromPlan,
      to_plan: toPlan,
    });
  },

  cancelled: (plan: string, reason?: string) => {
    posthog.capture('subscription_cancelled', {
      plan,
      reason,
    });
  },
};

/**
 * Check-in Events
 */
export const CheckInEvents = {
  manualCheckIn: (guestId: string, eventId: string) => {
    posthog.capture('guest_checked_in_manual', {
      guest_id: guestId,
      event_id: eventId,
    });
  },

  qrCheckIn: (guestId: string, eventId: string) => {
    posthog.capture('guest_checked_in_qr', {
      guest_id: guestId,
      event_id: eventId,
    });
  },

  bulkCheckIn: (count: number, eventId: string) => {
    posthog.capture('guests_checked_in_bulk', {
      count,
      event_id: eventId,
    });
  },

  undo: (guestId: string, eventId: string) => {
    posthog.capture('check_in_undone', {
      guest_id: guestId,
      event_id: eventId,
    });
  },
};

/**
 * Feature Usage Tracking
 */
export const FeatureEvents = {
  used: (featureName: string, context?: Record<string, unknown>) => {
    posthog.capture('feature_used', {
      feature_name: featureName,
      ...context,
    });
  },

  enabled: (featureName: string) => {
    posthog.capture('feature_enabled', {
      feature_name: featureName,
    });
  },

  disabled: (featureName: string) => {
    posthog.capture('feature_disabled', {
      feature_name: featureName,
    });
  },
};

/**
 * Engagement Events
 */
export const EngagementEvents = {
  sessionStart: () => {
    posthog.capture('session_started', {
      timestamp: new Date().toISOString(),
    });
  },

  sessionEnd: (duration: number) => {
    posthog.capture('session_ended', {
      duration_seconds: duration,
    });
  },

  pageView: (page: string, referrer?: string) => {
    posthog.capture('$pageview', {
      page,
      referrer,
    });
  },

  searchPerformed: (query: string, resultsCount: number) => {
    posthog.capture('search_performed', {
      query_length: query.length,
      results_count: resultsCount,
    });
  },

  filterApplied: (filterType: string, filterValue: string) => {
    posthog.capture('filter_applied', {
      filter_type: filterType,
      filter_value: filterValue,
    });
  },
};

# Forms, Validations, and Types Refactoring Guide

This document describes the comprehensive refactoring of forms, validations, and types in the WeddingFlow Pro application.

## 📁 Project Structure

```
src/
├── lib/validations/          # Centralized Zod validation schemas
│   ├── guest.schema.ts
│   ├── hotel.schema.ts
│   ├── vendor.schema.ts
│   ├── gift.schema.ts
│   ├── budget.schema.ts
│   ├── creative.schema.ts
│   ├── event.schema.ts
│   ├── eventFlow.schema.ts
│   ├── user.schema.ts       # ✨ NEW
│   ├── company.schema.ts    # ✨ NEW
│   └── index.ts             # ✨ NEW - Exports all schemas
│
├── types/                    # TypeScript type definitions
│   ├── guest.ts
│   ├── hotel.ts
│   ├── vendor.ts
│   ├── gift.ts
│   ├── budget.ts
│   ├── creative.ts
│   ├── event.ts
│   ├── eventFlow.ts
│   ├── api.ts               # ✨ NEW - API utility types
│   ├── forms.ts             # ✨ NEW - Form-specific types
│   └── index.ts             # ✨ NEW - Exports all types
│
├── components/forms/         # ✨ NEW - Reusable form components
│   ├── form-input.tsx
│   ├── form-textarea.tsx
│   ├── form-select.tsx
│   ├── form-checkbox.tsx
│   ├── form-date-picker.tsx
│   ├── form-currency-input.tsx
│   ├── form-phone-input.tsx
│   ├── form-file-upload.tsx
│   └── index.ts
│
└── hooks/                    # Custom React hooks
    ├── use-toast.ts
    ├── use-local-storage.ts      # ✨ NEW
    ├── use-session-storage.ts    # ✨ NEW
    ├── use-media-query.ts        # ✨ NEW
    ├── use-debounce.ts           # ✨ NEW
    ├── use-clipboard.ts          # ✨ NEW
    ├── use-online-status.ts      # ✨ NEW
    ├── use-form-autosave.ts      # ✨ NEW
    ├── use-pagination.ts         # ✨ NEW
    └── index.ts                  # ✨ NEW
```

## 🎯 What Was Accomplished

### 1. Centralized Validation Schemas

All Zod validation schemas are now located in `src/lib/validations/` and can be imported from a single index file:

```typescript
// Before (inline schemas)
const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  // ... rest of schema
});

// After (centralized)
import { vendorSchema } from '@/lib/validations';
```

**Available Schemas:**
- `guestSchema`, `guestFormSchema`, `bulkImportSchema`, `checkInSchema`
- `hotelSchema`, `hotelFormSchema`
- `vendorSchema`, `paymentSchema`
- `giftSchema`
- `budgetSchema`
- `creativeSchema`
- `eventSchema`, `eventFormSchema`
- `eventFlowSchema`
- `userSchema`, `userPreferencesSchema` (NEW)
- `companySchema`, `brandingSchema`, `aiConfigSchema` (NEW)

### 2. Type System Improvements

**New Utility Types (`types/api.ts`):**
```typescript
- ApiResponse<T>           // Generic API response wrapper
- PaginatedResponse<T>     // Paginated data response
- PaginationParams         // Pagination query params
- SortParams               // Sorting configuration
- Filter, FilterOperator   // Filtering types
- FileUploadResponse       // File upload result
- BulkOperationResult<T>   // Bulk operation results
- LoadingState             // 'idle' | 'loading' | 'success' | 'error'
- AsyncData<T>             // Async data state
- FormState                // Form submission state
- DateRange, TimeRange     // Date/time ranges
- Coordinates, Address     // Location types
```

**Form-Specific Types (`types/forms.ts`):**
```typescript
- FormFieldConfig          // Form field configuration
- SelectOption<T>          // Select dropdown options
- RadioOption<T>           // Radio button options
- CheckboxOption<T>        // Checkbox options
- FileInputConstraints     // File upload constraints
- CurrencyInputOptions     // Currency formatting options
- PhoneInputOptions        // Phone input configuration
- DatePickerOptions        // Date picker configuration
- TimePickerOptions        // Time picker configuration
- FormSection              // Form section grouping
- FormConfig               // Complete form configuration
- FormValidationError      // Validation error structure
- FormAutosaveOptions      // Autosave configuration
```

**Centralized Imports (`types/index.ts`):**
```typescript
import { ApiResponse, PaginatedResponse } from '@/types';
import { Guest, Vendor, GiftFormData } from '@/types';
```

### 3. Reusable Form Components

All form components integrate with React Hook Form and support TypeScript generics for type safety.

#### FormInput
```typescript
<FormInput
  control={form.control}
  name="guest_name"
  label="Guest Name"
  placeholder="John Doe"
  required
  description="Enter the full name of the guest"
/>
```

#### FormTextarea
```typescript
<FormTextarea
  control={form.control}
  name="notes"
  label="Notes"
  rows={5}
  placeholder="Additional notes..."
/>
```

#### FormSelect
```typescript
<FormSelect
  control={form.control}
  name="category"
  label="Category"
  required
  options={[
    { value: 'bride_family', label: 'Bride Family' },
    { value: 'groom_family', label: 'Groom Family' },
  ]}
/>
```

#### FormCheckbox
```typescript
<FormCheckbox
  control={form.control}
  name="accommodation_needed"
  label="Accommodation Needed"
  description="Guest needs hotel accommodation"
/>
```

#### FormDatePicker
```typescript
<FormDatePicker
  control={form.control}
  name="wedding_date"
  label="Wedding Date"
  required
  options={{
    minDate: new Date(),
    format: 'PPP',
  }}
/>
```

#### FormCurrencyInput
```typescript
<FormCurrencyInput
  control={form.control}
  name="totalCost"
  label="Total Cost"
  required
  options={{
    currency: 'USD',
    locale: 'en-US',
  }}
/>
```

#### FormPhoneInput
```typescript
<FormPhoneInput
  control={form.control}
  name="phone"
  label="Phone Number"
  placeholder="(555) 123-4567"
  options={{
    defaultCountry: 'US',
  }}
/>
```

#### FormFileUpload
```typescript
<FormFileUpload
  control={form.control}
  name="attachments"
  label="Upload Files"
  constraints={{
    accept: 'image/*,.pdf',
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 3,
  }}
  onUpload={async (files) => {
    // Handle file upload
    return uploadedUrls;
  }}
/>
```

### 4. Custom Hooks

#### useLocalStorage
```typescript
const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light');
```

#### useSessionStorage
```typescript
const [formData, setFormData, clearFormData] = useSessionStorage('form-draft', null);
```

#### useMediaQuery
```typescript
const isMobile = useIsMobile();
const isDesktop = useIsDesktop();
// Or custom query
const isCustom = useMediaQuery('(min-width: 900px)');
```

#### useDebounce
```typescript
const searchTerm = useDebounce(inputValue, 500);

// Or debounced callback
const debouncedSearch = useDebouncedCallback((term) => {
  // Search logic
}, 500);
```

#### useClipboard
```typescript
const { copied, copy, error } = useClipboard({
  timeout: 2000,
  onSuccess: () => toast.success('Copied!'),
});

<button onClick={() => copy(textToCopy)}>
  {copied ? 'Copied!' : 'Copy'}
</button>
```

#### useOnlineStatus
```typescript
const isOnline = useOnlineStatus();

{!isOnline && <Alert>You are offline</Alert>}
```

#### useFormAutosave
```typescript
const { clearSaved, hasSavedData, savedData } = useFormAutosave({
  watch: form.watch,
  storageKey: 'guest-form-draft',
  debounceMs: 1000,
  enabled: true,
  onSave: (data) => console.log('Auto-saved:', data),
});

// Restore saved data
useEffect(() => {
  if (hasSavedData && savedData) {
    form.reset(savedData);
  }
}, []);
```

#### usePagination
```typescript
const {
  currentPage,
  totalPages,
  pageSize,
  startIndex,
  endIndex,
  hasNextPage,
  hasPreviousPage,
  goToPage,
  nextPage,
  previousPage,
  setPageSize,
} = usePagination({
  totalItems: 100,
  itemsPerPage: 10,
  initialPage: 1,
});
```

## 🔄 Refactored Components

### Before:
```typescript
// vendor-dialog.tsx (inline schema)
const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  // ... more fields
});

type VendorFormValues = z.infer<typeof vendorSchema>;

const form = useForm<VendorFormValues>({
  resolver: zodResolver(vendorSchema),
  // ...
});
```

### After:
```typescript
// vendor-dialog.tsx (centralized schema)
import { vendorSchema, type VendorFormData } from '@/lib/validations';

const form = useForm<VendorFormData>({
  resolver: zodResolver(vendorSchema),
  // ...
});
```

**Refactored Components:**
- ✅ `vendor-dialog.tsx` - Now uses centralized schema
- ✅ `gift-dialog.tsx` - Now uses centralized schema

## 🎨 Validation Improvements

### Cross-Field Validation Example
```typescript
export const eventSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  // ... other fields
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);
```

### Async Validation Example
```typescript
export const emailSchema = z.string().email().refine(
  async (email) => {
    const exists = await checkEmailExists(email);
    return !exists;
  },
  { message: 'Email already exists' }
);
```

### Custom Error Messages
All schemas now include clear, user-friendly error messages:
```typescript
z.string().min(2, 'Name must be at least 2 characters')
z.number().min(0, 'Value must be positive')
z.email('Invalid email address')
```

## 📝 Usage Examples

### Creating a New Form

1. **Define validation schema:**
```typescript
// src/lib/validations/myfeature.schema.ts
import { z } from 'zod';

export const myFeatureSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

export type MyFeatureFormData = z.infer<typeof myFeatureSchema>;
```

2. **Create form component:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { myFeatureSchema, type MyFeatureFormData } from '@/lib/validations';
import { FormInput, FormSelect } from '@/components/forms';

export function MyFeatureForm() {
  const form = useForm<MyFeatureFormData>({
    resolver: zodResolver(myFeatureSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'active',
    },
  });

  const onSubmit = (data: MyFeatureFormData) => {
    // Handle submission
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormInput
        control={form.control}
        name="title"
        label="Title"
        required
      />

      <FormInput
        control={form.control}
        name="description"
        label="Description"
      />

      <FormSelect
        control={form.control}
        name="status"
        label="Status"
        options={[
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ]}
      />

      <button type="submit">Submit</button>
    </form>
  );
}
```

## 🧪 Testing Forms

### Type Safety
All form components are fully typed. TypeScript will catch:
- Invalid field names
- Type mismatches
- Missing required props

### Validation Testing
```typescript
import { myFeatureSchema } from '@/lib/validations';

describe('MyFeature Schema', () => {
  it('validates correct data', () => {
    const result = myFeatureSchema.safeParse({
      title: 'Test',
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid data', () => {
    const result = myFeatureSchema.safeParse({
      title: '', // Empty title
      status: 'active',
    });
    expect(result.success).toBe(false);
  });
});
```

## 🚀 Benefits

1. **Code Reusability**: Form components can be reused across the application
2. **Type Safety**: Full TypeScript support with generics
3. **Consistency**: Uniform validation and error handling
4. **Maintainability**: Single source of truth for schemas
5. **Developer Experience**: IntelliSense and auto-completion
6. **Accessibility**: Built-in ARIA attributes and labels
7. **Performance**: Optimized re-renders with React Hook Form

## 📚 Additional Resources

- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)

## 🔜 Future Enhancements

- [ ] Add form wizard component for multi-step forms
- [ ] Create form field array component for dynamic lists
- [ ] Add rich text editor component
- [ ] Implement conditional field visibility
- [ ] Add form analytics and tracking
- [ ] Create form builder for dynamic forms
- [ ] Add internationalization (i18n) support
- [ ] Implement advanced async validation with debouncing

## 🤝 Contributing

When adding new forms:
1. Create validation schema in `src/lib/validations/`
2. Export types from the schema file
3. Add to `src/lib/validations/index.ts`
4. Use reusable form components
5. Follow existing patterns and conventions
6. Add appropriate TypeScript types
7. Include error messages in validation

---

**Last Updated:** October 2025
**Refactored By:** Claude Code

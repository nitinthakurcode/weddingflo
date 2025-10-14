# Forms Quick Reference Guide

Quick reference for using the centralized form system in WeddingFlow Pro.

## 📦 Import Patterns

```typescript
// Validation schemas
import { guestFormSchema, vendorSchema, giftSchema } from '@/lib/validations';

// Types
import { Guest, Vendor, GiftFormData } from '@/types';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { SelectOption, FormFieldConfig } from '@/types/forms';

// Form components
import { FormInput, FormTextarea, FormSelect, FormCheckbox } from '@/components/forms';
import { FormDatePicker, FormCurrencyInput, FormPhoneInput } from '@/components/forms';

// Hooks
import { useLocalStorage, useDebounce, useFormAutosave } from '@/hooks';
```

## 🎯 Common Form Patterns

### Basic Form Setup

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { guestFormSchema, type GuestFormData } from '@/lib/validations';
import { FormInput } from '@/components/forms';

function GuestForm() {
  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      guest_name: '',
      // ... other defaults
    },
  });

  const onSubmit = (data: GuestFormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormInput
        control={form.control}
        name="guest_name"
        label="Guest Name"
        required
      />
    </form>
  );
}
```

### Form with Auto-save

```typescript
import { useFormAutosave } from '@/hooks';

function FormWithAutosave() {
  const form = useForm<FormData>({ /* ... */ });

  const { hasSavedData, savedData, clearSaved } = useFormAutosave({
    watch: form.watch,
    storageKey: 'form-draft',
    debounceMs: 1000,
  });

  useEffect(() => {
    if (hasSavedData && savedData) {
      form.reset(savedData);
    }
  }, []);

  return (
    <>
      {hasSavedData && (
        <Alert>
          Draft saved! <Button onClick={clearSaved}>Clear</Button>
        </Alert>
      )}
      <form>{/* form fields */}</form>
    </>
  );
}
```

### Form with Pagination

```typescript
import { usePagination } from '@/hooks';

function PaginatedList({ items }: { items: any[] }) {
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    nextPage,
    previousPage,
  } = usePagination({
    totalItems: items.length,
    itemsPerPage: 10,
  });

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <>
      {visibleItems.map(item => <div key={item.id}>{item.name}</div>)}

      <div>
        <button onClick={previousPage}>Previous</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={nextPage}>Next</button>
      </div>
    </>
  );
}
```

## 🎨 Form Component Cheat Sheet

### Text Input
```typescript
<FormInput
  control={form.control}
  name="fieldName"
  label="Label"
  placeholder="Placeholder"
  required
  disabled={false}
  type="text" // or "email", "number", "tel", "url", "password"
  description="Help text"
/>
```

### Textarea
```typescript
<FormTextarea
  control={form.control}
  name="notes"
  label="Notes"
  rows={5}
  placeholder="Enter notes..."
/>
```

### Select Dropdown
```typescript
<FormSelect
  control={form.control}
  name="category"
  label="Category"
  required
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2', disabled: true },
  ]}
/>
```

### Checkbox
```typescript
<FormCheckbox
  control={form.control}
  name="acceptTerms"
  label="I accept the terms"
  description="You must accept to continue"
/>
```

### Date Picker
```typescript
<FormDatePicker
  control={form.control}
  name="eventDate"
  label="Event Date"
  required
  options={{
    minDate: new Date(),
    maxDate: new Date(2026, 11, 31),
    format: 'PPP',
  }}
/>
```

### Currency Input
```typescript
<FormCurrencyInput
  control={form.control}
  name="budget"
  label="Budget"
  options={{
    currency: 'USD',
    locale: 'en-US',
    allowNegative: false,
  }}
/>
```

### Phone Input
```typescript
<FormPhoneInput
  control={form.control}
  name="phoneNumber"
  label="Phone"
  options={{
    defaultCountry: 'US',
  }}
/>
```

### File Upload
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
    const urls = await uploadFiles(files);
    return urls;
  }}
/>
```

## 🪝 Hook Cheat Sheet

### Storage Hooks
```typescript
// Local Storage (persists across sessions)
const [value, setValue, removeValue] = useLocalStorage('key', defaultValue);

// Session Storage (cleared when tab closes)
const [value, setValue, removeValue] = useSessionStorage('key', defaultValue);
```

### Media Query Hooks
```typescript
const isMobile = useIsMobile();           // < 768px
const isTablet = useIsTablet();           // 769px - 1024px
const isDesktop = useIsDesktop();         // > 1024px
const isSmallScreen = useIsSmallScreen(); // < 640px
const isLargeScreen = useIsLargeScreen(); // > 1280px

// Custom query
const matches = useMediaQuery('(min-width: 900px)');
```

### Debounce Hooks
```typescript
// Debounce value
const debouncedValue = useDebounce(value, 500);

// Debounce callback
const debouncedSearch = useDebouncedCallback((term) => {
  search(term);
}, 500);
```

### Clipboard Hook
```typescript
const { copied, copy, error } = useClipboard({
  timeout: 2000,
  onSuccess: () => console.log('Copied!'),
  onError: (err) => console.error(err),
});

// Usage
<button onClick={() => copy('text to copy')}>
  {copied ? 'Copied!' : 'Copy'}
</button>
```

### Online Status Hook
```typescript
const isOnline = useOnlineStatus();

{!isOnline && <Alert>You are currently offline</Alert>}
```

## 🔍 Validation Schema Examples

### Basic Schema
```typescript
export const basicSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18+'),
});
```

### Schema with Transforms
```typescript
export const transformSchema = z.object({
  price: z.string().transform(val => parseFloat(val)),
  date: z.string().transform(val => new Date(val)),
});
```

### Schema with Refinements
```typescript
export const refinedSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
```

### Schema with Custom Validation
```typescript
export const customSchema = z.object({
  username: z.string().refine(
    async (val) => await checkUsernameAvailable(val),
    { message: 'Username already taken' }
  ),
});
```

## 📊 Type Examples

### API Response Types
```typescript
// Single item response
type UserResponse = ApiResponse<User>;

// Paginated response
type UsersResponse = PaginatedResponse<User>;

// Usage
const response: ApiResponse<Guest> = {
  success: true,
  data: guestData,
  message: 'Guest retrieved successfully',
};
```

### Form Types
```typescript
// Select options
const statusOptions: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// Form config
const formConfig: FormConfig = {
  id: 'guest-form',
  title: 'Add Guest',
  submitLabel: 'Save Guest',
  sections: [
    {
      id: 'basic-info',
      title: 'Basic Information',
      fields: ['name', 'email', 'phone'],
    },
  ],
};
```

## 🎯 Best Practices

1. **Always use centralized schemas** - Never define inline Zod schemas
2. **Type your forms** - Use inferred types from schemas
3. **Provide error messages** - Every validation should have a clear message
4. **Use reusable components** - Prefer FormInput over raw Input
5. **Handle loading states** - Show loading indicators during submission
6. **Validate on submit** - Default validation mode is 'onSubmit'
7. **Clear forms after success** - Reset form after successful submission
8. **Show success feedback** - Use toast notifications
9. **Handle errors gracefully** - Display user-friendly error messages
10. **Use TypeScript strictly** - Enable strict mode for type safety

## 🐛 Common Issues & Solutions

### Issue: Form not validating
```typescript
// ❌ Wrong - missing resolver
const form = useForm<FormData>();

// ✅ Correct - with resolver
const form = useForm<FormData>({
  resolver: zodResolver(mySchema),
});
```

### Issue: Field not controlled
```typescript
// ❌ Wrong - no control prop
<Input name="fieldName" />

// ✅ Correct - with control
<FormInput
  control={form.control}
  name="fieldName"
  label="Label"
/>
```

### Issue: Default values not working
```typescript
// ❌ Wrong - defaults inside component
const form = useForm<FormData>();
form.setValue('name', 'Default');

// ✅ Correct - defaults in useForm
const form = useForm<FormData>({
  defaultValues: {
    name: 'Default',
  },
});
```

### Issue: Form not resetting
```typescript
// ❌ Wrong - just clearing values
form.setValue('name', '');

// ✅ Correct - reset form
form.reset({
  name: '',
  // ... all fields
});
```

## 📞 Need Help?

- Check the [Forms Refactor Guide](./FORMS_REFACTOR_GUIDE.md) for detailed documentation
- Review existing forms for examples
- TypeScript will help catch most issues
- Use browser DevTools to debug form state

---

**Quick Reference Version:** 1.0
**Last Updated:** October 2025

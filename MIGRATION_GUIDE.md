# Frontend Migration Guide: Convex to Supabase

## Overview
This guide provides patterns and instructions for migrating all remaining frontend files from Convex to Supabase + React Query.

## Migration Status

### Completed (8 files)
- ✅ `src/components/dashboard/header.tsx`
- ✅ `src/components/guests/bulk-import-dialog.tsx`
- ✅ `src/components/guests/guest-dialog.tsx`
- ✅ `src/components/guests/qr-code-generator.tsx`
- ✅ `src/components/guests/check-in-scanner.tsx`
- ✅ `src/components/budget/budget-item-dialog.tsx`
- ✅ `src/components/notifications/notification-dropdown.tsx`
- ✅ `src/components/notifications/notification-bell.tsx`

### Pending (36 files)

#### UI Components (11 files)
1. `src/components/creatives/creative-job-dialog.tsx`
2. `src/components/gifts/gift-dialog.tsx`
3. `src/components/messages/chat-room.tsx` ⚠️ Needs Realtime
4. `src/components/messages/conversation-list.tsx` ⚠️ Needs Realtime
5. `src/components/messages/ai-assistant-panel.tsx`
6. `src/components/vendors/vendor-dialog.tsx`
7. `src/components/vendors/payment-tracker.tsx`
8. `src/components/settings/avatar-upload.tsx` ⚠️ Storage migration
9. `src/components/settings/logo-upload.tsx` ⚠️ Storage migration
10. `src/components/settings/profile-form.tsx`
11. `src/components/settings/branding-form.tsx`

#### Page Components (22 files)
12. `src/app/(dashboard)/dashboard/page.tsx`
13. `src/app/(dashboard)/dashboard/budget/page.tsx`
14. `src/app/(dashboard)/settings/billing/page.tsx`
15. `src/app/(dashboard)/admin/companies/page.tsx`
16. `src/app/(dashboard)/dashboard/creatives/page.tsx`
17. `src/app/(dashboard)/dashboard/gifts/page.tsx`
18. `src/app/(dashboard)/dashboard/hotels/page.tsx`
19. `src/app/(dashboard)/dashboard/vendors/page.tsx`
20. `src/app/(dashboard)/dashboard/events/page.tsx`
21. `src/app/(dashboard)/dashboard/timeline/page.tsx`
22. `src/app/(dashboard)/dashboard/guests/page.tsx`
23. `src/app/(dashboard)/messages/page.tsx` ⚠️ Needs Realtime
24. `src/app/(dashboard)/settings/company/page.tsx`
25. `src/app/(dashboard)/settings/team/page.tsx`
26. `src/app/(dashboard)/settings/profile/page.tsx`
27. `src/app/(dashboard)/settings/preferences/page.tsx`
28. `src/app/(dashboard)/settings/ai-config/page.tsx`
29. `src/app/(dashboard)/dashboard/onboard/page.tsx`
30. `src/app/onboard/page.tsx`
31. `src/app/qr/[token]/page.tsx`
32. `src/app/check-in/page.tsx`

#### Utility Files (3 files)
33. `src/lib/hooks/use-subscription.ts`
34. `src/lib/permissions/can.ts`
35. `src/lib/activity/log-activity.ts`

## Standard Migration Pattern

### Step 1: Update Imports

```typescript
// REMOVE
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

// ADD
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
import { useUser } from '@clerk/nextjs'; // If authentication needed
```

### Step 2: Initialize Hooks

```typescript
const supabase = useSupabase();
const queryClient = useQueryClient();
const { user } = useUser(); // If auth needed
```

### Step 3: Replace useQuery

```typescript
// OLD
const data = useQuery(api.table.list, { param: value });

// NEW
const { data, isLoading, error } = useQuery({
  queryKey: ['table-name', param],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('column', value)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  enabled: !!param,
});
```

### Step 4: Replace useMutation (Create)

```typescript
// OLD
const create = useMutation(api.table.create);
await create({ name: 'test' });

// NEW
const create = useMutation({
  mutationFn: async (data: any) => {
    const { data: result, error } = await supabase
      .from('table_name')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['table-name'] });
    // Add toast notification if needed
  },
});

// Usage
await create.mutateAsync({ name: 'test' });
```

### Step 5: Replace useMutation (Update)

```typescript
// OLD
const update = useMutation(api.table.update);
await update({ id, ...data });

// NEW
const update = useMutation({
  mutationFn: async ({ id, ...data }: any) => {
    const { data: result, error } = await supabase
      .from('table_name')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['table-name'] });
  },
});
```

### Step 6: Replace useMutation (Delete)

```typescript
// OLD
const remove = useMutation(api.table.remove);
await remove({ id });

// NEW
const remove = useMutation({
  mutationFn: async (id: string) => {
    const { error } = await supabase
      .from('table_name')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['table-name'] });
  },
});
```

### Step 7: Update Type References

```typescript
// Replace ALL instances
Id<'table'> → string
_id → id
```

## Special Cases

### File Uploads (avatar-upload.tsx, logo-upload.tsx)

```typescript
// OLD - Convex Storage
const generateUploadUrl = useMutation(api.files.generateUploadUrl);
const url = await generateUploadUrl();
await fetch(url, { method: 'POST', body: file });

// NEW - Supabase Storage
const uploadFile = useMutation({
  mutationFn: async (file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `avatars/${user?.id}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    // Save URL to database
    const { data, error } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', user?.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
  },
});
```

### Real-time Messages (chat-room.tsx, conversation-list.tsx)

```typescript
// Query messages
const { data: messages } = useQuery({
  queryKey: ['messages', conversationId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  enabled: !!conversationId,
});

// Subscribe to real-time updates
useEffect(() => {
  if (!conversationId) return;

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [conversationId, supabase, queryClient]);

// Send message mutation
const sendMessage = useMutation({
  mutationFn: async (content: string) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user?.id,
        content,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
  },
});
```

### Dashboard Pages (Multiple Queries)

```typescript
// Run multiple queries in parallel
const { data: stats } = useQuery({
  queryKey: ['dashboard-stats', userId],
  queryFn: async () => {
    const [guests, budget, vendors] = await Promise.all([
      supabase.from('guests').select('*', { count: 'exact', head: true }),
      supabase.from('budget_items').select('budget, actual_cost'),
      supabase.from('vendors').select('*', { count: 'exact', head: true }),
    ]);

    return {
      totalGuests: guests.count || 0,
      totalBudget: budget.data?.reduce((sum, item) => sum + item.budget, 0) || 0,
      totalVendors: vendors.count || 0,
    };
  },
  enabled: !!userId,
});
```

### Permission Check (can.ts)

```typescript
// OLD
import { Id } from '@/convex/_generated/dataModel';
export async function can(userId: Id<'users'>, action: string): Promise<boolean>

// NEW
export async function can(userId: string, action: string): Promise<boolean> {
  const supabase = createClient();
  const { data: user } = await supabase
    .from('users')
    .select('role, permissions')
    .eq('id', userId)
    .single();

  // Check permissions logic
  return user?.permissions?.includes(action) || false;
}
```

## Database Table Name Mapping

| Convex Collection | Supabase Table |
|------------------|----------------|
| `users` | `users` |
| `companies` | `companies` |
| `clients` | `clients` |
| `guests` | `guests` |
| `events` | `events` |
| `budget` / `budgetItems` | `budget_items` |
| `vendors` | `vendors` |
| `creativeJobs` | `creative_jobs` |
| `gifts` | `gifts` |
| `hotels` | `hotels` |
| `messages` | `messages` |
| `conversations` | `conversations` |
| `notifications` | `notifications` |
| `activities` | `activities` |
| `subscriptions` | `subscriptions` |

## Common Query Patterns

### Filtering
```typescript
.eq('column', value)           // WHERE column = value
.neq('column', value)          // WHERE column != value
.gt('column', value)           // WHERE column > value
.gte('column', value)          // WHERE column >= value
.lt('column', value)           // WHERE column < value
.lte('column', value)          // WHERE column <= value
.like('column', '%value%')     // WHERE column LIKE '%value%'
.in('column', [val1, val2])    // WHERE column IN (val1, val2)
.is('column', null)            // WHERE column IS NULL
```

### Joining
```typescript
.select('*, related_table(*)')
.select('column1, column2, related_table!inner(column3)')
```

### Ordering
```typescript
.order('created_at', { ascending: false })
.order('name', { ascending: true })
```

### Pagination
```typescript
.range(0, 9)     // First 10 records
.range(10, 19)   // Next 10 records
.limit(10)       // Limit to 10 records
```

## Testing Checklist

For each migrated file:
- [ ] All imports updated
- [ ] All `Id<>` types replaced with `string`
- [ ] All `_id` references changed to `id`
- [ ] All queries converted to React Query
- [ ] All mutations converted to React Query
- [ ] Cache invalidation added to mutations
- [ ] Error handling preserved
- [ ] Loading states working
- [ ] TypeScript errors resolved
- [ ] File compiles successfully

## Common Issues & Solutions

### Issue: "Cannot find module '@/lib/supabase/client'"
**Solution**: Use `/lib/supabase/client` instead of `@/lib/supabase/client` or verify path alias

### Issue: Type errors with query data
**Solution**: Add proper TypeScript types to queryFn return

### Issue: Mutations not updating UI
**Solution**: Ensure `queryClient.invalidateQueries()` is called in `onSuccess`

### Issue: "Headers" error in Supabase client
**Solution**: Make sure `useSupabase()` is called inside component, not at module level

## Next Steps

1. Copy this file to project root
2. Use patterns above to migrate remaining files
3. Test each migration thoroughly
4. Update any integration tests
5. Remove Convex dependencies once complete

## Support

For complex migrations or issues, refer to:
- Supabase Docs: https://supabase.com/docs
- React Query Docs: https://tanstack.com/query/latest/docs/react
- Clerk + Supabase Integration: https://clerk.com/docs/integrations/databases/supabase

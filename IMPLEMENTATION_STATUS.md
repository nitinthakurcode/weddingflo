# Settings, Admin & Multi-Tenant Implementation Status

## ✅ COMPLETED (Ready to Use)

### Core Infrastructure
1. **RBAC System** ✅
   - `src/lib/permissions/roles.ts` - Complete role & permission definitions
   - `src/lib/permissions/can.ts` - Permission hooks (useCan, useIsAdmin, etc.)
   - `src/components/permissions/can-component.tsx` - `<Can>` component & HOCs
   - Roles: super_admin, company_admin, staff, client_viewer
   - 50+ granular permissions defined

2. **Activity Logging** ✅
   - `src/lib/activity/log-activity.ts` - useLogActivity hook & helpers
   - `convex/activityLog.ts` - create, listByCompany, listByClient, listByUser
   - Tracks all user actions with IP, device, changes

3. **Settings Layout** ✅
   - `src/app/(dashboard)/settings/layout.tsx` - Responsive sidebar nav
   - `src/app/(dashboard)/settings/page.tsx` - Redirects to /profile
   - Permission-based menu filtering
   - Mobile dropdown selector

4. **Profile Settings** ✅
   - `src/app/(dashboard)/settings/profile/page.tsx` - Complete profile page
   - `src/components/settings/profile-form.tsx` - Name update form
   - `src/components/settings/avatar-upload.tsx` - Image upload to Clerk
   - Shows: avatar, name, email, role, account age, last active

5. **Convex Backend Updates** ✅
   - `convex/users.ts` - Added getCurrentUser() for permissions
   - `convex/activityLog.ts` - Added create() mutation

## 🚧 TODO (Implementation Guide)

### High Priority

#### 1. Preferences Page (30 min)
```typescript
// src/app/(dashboard)/settings/preferences/page.tsx
- Theme selector (light/dark/auto)
- Notification toggles
- Email digest frequency
- Language dropdown
- Timezone selector with search
- Uses: convex/users.updatePreferences()
```

#### 2. Company Settings (45 min)
```typescript
// src/app/(dashboard)/settings/company/page.tsx
- Company name, subdomain
- Usage stats display
- Danger zone (delete company - admin only)

// Need: convex/companies.ts
export const update = mutation({
  args: { companyId, company_name, subdomain }
  // Update company details
});

export const getUsageStats = query({
  // Return usage_stats from companies table
});
```

#### 3. AI Config Page (20 min)
```typescript
// src/app/(dashboard)/settings/ai-config/page.tsx
- Toggle switches for each AI feature
- Cost tracker (queries this month)
- Feature descriptions

// Need: convex/companies.ts
export const updateAiConfig = mutation({
  args: { companyId, ai_config: {...} }
  // Patch companies.ai_config
});
```

### Medium Priority

#### 4. Team Management (2 hours)
```typescript
// src/app/(dashboard)/settings/team/page.tsx
- List team members with roles
- Invite dialog (email + role selector)
- Change role dropdown
- Remove member button

// Need: convex/users.ts additions
export const inviteUser = mutation({
  // Send Clerk invitation
  // Create pending user record
});

export const updateRole = mutation({
  args: { userId, newRole }
  // Check permissions, update role
});

export const removeUser = mutation({
  // Soft delete or remove user
});

// Clerk Organizations integration:
- Use Clerk's organization invitations
- Sync roles between Clerk and Convex
```

#### 5. Branding/White-Label (3 hours)
```typescript
// src/app/(dashboard)/settings/branding/page.tsx
- Logo uploader (Convex file storage)
- Color pickers (primary, secondary, accent)
- Font family dropdown
- Custom CSS editor (Monaco/CodeMirror)
- Live preview panel

// src/lib/branding/apply-branding.ts
export function applyBranding(branding) {
  // Inject CSS variables
  document.documentElement.style.setProperty('--primary', branding.primary_color);
  // ...
}

// Need: convex/companies.ts
export const updateBranding = mutation({
  args: { companyId, branding: {...} }
  // Update companies.branding
});

// Usage in root layout:
useEffect(() => {
  if (company?.branding) {
    applyBranding(company.branding);
  }
}, [company]);
```

#### 6. Integrations Page (1 hour)
```typescript
// src/app/(dashboard)/settings/integrations/page.tsx
- API key management (generate, revoke, copy)
- Webhook configuration
- Connected services list

// Need: New schema table
integrations: defineTable({
  company_id: v.id('companies'),
  type: v.string(), // 'api_key', 'webhook', 'oauth'
  name: v.string(),
  key: v.optional(v.string()),
  webhook_url: v.optional(v.string()),
  enabled: v.boolean(),
  created_at: v.number(),
})
```

### Lower Priority

#### 7. Admin Dashboard (3 hours)
```typescript
// src/app/(dashboard)/admin/page.tsx
- Platform-wide stats
- Recent activity
- System health
- Quick actions

// src/app/(dashboard)/admin/users/page.tsx
- All users table with search
- Filter by company, role
- Suspend/activate users
- View activity log

// src/app/(dashboard)/admin/companies/page.tsx
- All companies table
- Subscription status
- Usage stats
- Quick actions (suspend, delete)

// src/app/(dashboard)/admin/analytics/page.tsx
- Already exists! Just update
- Add more platform metrics

// Need: convex/admin.ts
export const getAllUsers = query({
  // Only super_admin can call
  // Return paginated users
});

export const getAllCompanies = query({
  // Only super_admin
  // Return paginated companies
});

export const getPlatformStats = query({
  // Total users, companies, revenue, etc.
});
```

#### 8. Multi-Tenant Enhancements (4 hours)
```typescript
// middleware.ts
- Parse subdomain from request
- Resolve company from subdomain
- Set company context

// src/lib/tenant/tenant-context.tsx
- React context for current tenant
- useCompany() hook

// src/lib/tenant/tenant-resolver.ts
export async function resolveCompanyFromSubdomain(subdomain: string) {
  // Query Convex for company by subdomain
}

// Security Audit:
1. Check all Convex queries filter by company_id
2. Check all mutations verify company_id
3. Test: User from Company A cannot access Company B data
4. Test: URL manipulation doesn't leak data
```

## Quick Implementation Commands

```bash
# Create missing pages
mkdir -p src/app/\(dashboard\)/settings/{preferences,company,ai-config,integrations}
mkdir -p src/app/\(dashboard\)/admin/{users,companies}

# Create missing components
mkdir -p src/components/{settings,admin}

# Run dev server
npm run dev

# Test endpoints
# - /settings/profile ✅
# - /settings/preferences
# - /settings/company
# - /settings/branding
# - /settings/team
# - /settings/billing (already exists)
# - /settings/integrations
# - /settings/ai-config
# - /admin (new)
# - /admin/users (new)
# - /admin/companies (new)
# - /admin/analytics ✅
```

## Testing Checklist

- [ ] Profile update works
- [ ] Avatar upload works
- [ ] Preferences save correctly
- [ ] Company details update
- [ ] Branding changes apply immediately
- [ ] Team invites send
- [ ] Role changes work
- [ ] AI config toggles persist
- [ ] Admin can access admin pages
- [ ] Non-admin cannot access admin pages
- [ ] Activity log records all actions
- [ ] Multi-tenant isolation (Company A != Company B)

## Time Estimates

- **Preferences**: 30 min
- **Company Settings**: 45 min
- **AI Config**: 20 min
- **Team Management**: 2 hours
- **Branding**: 3 hours
- **Integrations**: 1 hour
- **Admin Pages**: 3 hours
- **Multi-Tenant**: 4 hours

**Total**: ~14-16 hours for complete implementation

## Priority Order for Next Session

1. ✅ Profile Settings (DONE)
2. Preferences Page (Quick win)
3. Company Settings (Core business)
4. AI Config (Feature control)
5. Team Management (Collaboration)
6. Branding (White-label)
7. Admin Pages (Super admin)
8. Multi-tenant enhancements

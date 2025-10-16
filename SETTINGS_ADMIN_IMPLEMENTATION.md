# Settings, Admin Panel & Multi-Tenant Implementation

## ✅ Completed

### 1. RBAC Permission System
- ✅ `src/lib/permissions/roles.ts` - Role definitions and permissions
- ✅ `src/lib/permissions/can.ts` - Permission hooks (useCan, useIsAdmin, etc.)
- ✅ `src/components/permissions/can-component.tsx` - Permission-based components

### 2. Activity Logging
- ✅ `src/lib/activity/log-activity.ts` - Activity logging helpers
- ✅ `convex/activityLog.ts` - Updated with create mutation
- ✅ `convex/users.ts` - Updated with getCurrentUser query

### 3. Settings Layout
- ✅ `src/app/(dashboard)/settings/layout.tsx` - Sidebar navigation
- ✅ `src/app/(dashboard)/settings/page.tsx` - Redirect to profile

## 🚧 In Progress / Todo

### Profile Settings
- [ ] `src/app/(dashboard)/settings/profile/page.tsx`
- [ ] `src/components/settings/profile-form.tsx`
- [ ] `src/components/settings/avatar-upload.tsx`
- [ ] `src/components/settings/password-change-form.tsx`
- [ ] `src/components/settings/two-factor-setup.tsx`

### Company Settings
- [ ] `src/app/(dashboard)/settings/company/page.tsx`
- [ ] `src/components/settings/company-form.tsx`
- [ ] `src/components/settings/company-stats.tsx`
- [ ] `src/components/settings/danger-zone.tsx`
- [ ] `convex/companies.ts` - Add update mutation

### Branding/White-Label
- [ ] `src/app/(dashboard)/settings/branding/page.tsx`
- [ ] `src/components/settings/branding-form.tsx`
- [ ] `src/components/settings/logo-uploader.tsx`
- [ ] `src/components/settings/color-picker.tsx`
- [ ] `src/components/settings/custom-css-editor.tsx`
- [ ] `src/components/settings/branding-preview.tsx`
- [ ] `src/lib/branding/apply-branding.ts` - Dynamic CSS injection
- [ ] `convex/companies.ts` - Add branding update mutation

### Team Management
- [ ] `src/app/(dashboard)/settings/team/page.tsx`
- [ ] `src/components/settings/team-member-list.tsx`
- [ ] `src/components/settings/invite-member-dialog.tsx`
- [ ] `src/components/settings/role-selector.tsx`
- [ ] `convex/users.ts` - Add inviteUser, updateRole, removeUser
- [ ] Clerk Organizations integration

### Integrations
- [ ] `src/app/(dashboard)/settings/integrations/page.tsx`
- [ ] `src/components/settings/api-keys.tsx`
- [ ] `src/components/settings/webhooks.tsx`
- [ ] `convex/integrations.ts` - New file

### AI Config
- [ ] `src/app/(dashboard)/settings/ai-config/page.tsx`
- [ ] `src/components/settings/ai-toggle.tsx`
- [ ] `src/components/settings/ai-cost-tracker.tsx`
- [ ] `convex/companies.ts` - Add AI config update

### Preferences
- [ ] `src/app/(dashboard)/settings/preferences/page.tsx`
- [ ] `src/components/settings/notification-settings.tsx`
- [ ] `src/components/settings/language-selector.tsx`
- [ ] `src/components/settings/timezone-selector.tsx`

### Admin Features
- [ ] `src/app/(dashboard)/admin/page.tsx` - Admin dashboard
- [ ] `src/app/(dashboard)/admin/users/page.tsx` - All users
- [ ] `src/app/(dashboard)/admin/companies/page.tsx` - All companies
- [ ] `src/components/admin/user-management.tsx`
- [ ] `src/components/admin/company-management.tsx`
- [ ] `src/components/admin/activity-log-viewer.tsx`
- [ ] `src/components/admin/usage-stats.tsx`
- [ ] `convex/admin.ts` - New file for admin queries

### Multi-Tenant Isolation
- [ ] `middleware.ts` - Update for subdomain routing
- [ ] `src/lib/tenant/tenant-resolver.ts`
- [ ] `src/lib/tenant/tenant-context.tsx`
- [ ] Verify all Convex queries filter by companyId
- [ ] Add companyId checks to all mutations

### Testing
- [ ] Test all settings pages
- [ ] Test profile updates
- [ ] Test branding changes apply
- [ ] Test team invites
- [ ] Test admin access control
- [ ] Test multi-tenant isolation
- [ ] Test activity logging

## Priority Order

1. **Profile Settings** (Most common use case)
2. **Company Settings** (Core business info)
3. **Preferences** (User experience)
4. **Team Management** (Collaboration)
5. **Branding** (White-label)
6. **AI Config** (Feature control)
7. **Integrations** (Advanced)
8. **Admin Features** (Super admin only)
9. **Multi-Tenant Improvements** (Infrastructure)

## Next Steps

Continue building in the priority order above, starting with Profile Settings.

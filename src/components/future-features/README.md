# Future Features

These components are for features currently being implemented or planned for future development.

## Creatives Module
- **Status:** Implementation in progress
- **Database table:** creative_jobs (being created)
- **Purpose:** Track creative deliverables (videos, photos, graphics, invitations)

### Files:
- `creatives-page.tsx.disabled` - Main creatives dashboard page
- `creative-job-dialog.tsx.disabled` - Add/Edit dialog for creative jobs
- `creative-kanban.tsx.disabled` - Kanban board for job tracking
- `creative-stats.tsx.disabled` - Statistics display
- `creative-stats-cards.tsx.disabled` - Stats card components
- `file-gallery.tsx.disabled` - File gallery view
- `progress-tracker.tsx.disabled` - Progress tracking component

### To Enable:
1. ✅ Create creative_jobs table migration
2. ✅ Apply migration to database
3. ✅ Regenerate TypeScript types
4. ✅ Create creatives tRPC router
5. ✅ Add router to app
6. ✅ Rename .disabled files back to .tsx
7. ✅ Add to sidebar navigation
8. ✅ Test full CRUD operations

### Database Schema Required:
```sql
CREATE TABLE creative_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,  -- 'video', 'photo', 'graphic', 'invitation', 'other'
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'requested',  -- 'requested', 'in_progress', 'review', 'approved', 'completed'
  assigned_to TEXT,
  priority TEXT DEFAULT 'medium',  -- 'low', 'medium', 'high'
  notes TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Status: 🚧 IN PROGRESS
Implementation started on 2025-10-19.

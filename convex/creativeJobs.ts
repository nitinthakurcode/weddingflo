import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { Id } from './_generated/dataModel';

// Get all creative jobs for a wedding
export const getCreativeJobsByWedding = query({
  args: {
    weddingId: v.id('weddings'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const jobs = await ctx.db
      .query('creative_jobs')
      .withIndex('by_wedding', (q) => q.eq('weddingId', args.weddingId))
      .collect();

    return jobs;
  },
});

// Get creative jobs by status (for Kanban columns)
export const getCreativeJobsByStatus = query({
  args: {
    weddingId: v.id('weddings'),
    status: v.union(
      v.literal('pending'),
      v.literal('in_progress'),
      v.literal('review'),
      v.literal('approved'),
      v.literal('completed'),
      v.literal('cancelled')
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const jobs = await ctx.db
      .query('creative_jobs')
      .withIndex('by_status', (q) =>
        q.eq('weddingId', args.weddingId).eq('status', args.status)
      )
      .collect();

    return jobs;
  },
});

// Get creative stats (counts by status)
export const getCreativeStats = query({
  args: {
    weddingId: v.id('weddings'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const jobs = await ctx.db
      .query('creative_jobs')
      .withIndex('by_wedding', (q) => q.eq('weddingId', args.weddingId))
      .collect();

    const now = Date.now();
    const overdue = jobs.filter((job) => {
      if (!job.due_date || job.status === 'completed' || job.status === 'cancelled') {
        return false;
      }
      return new Date(job.due_date).getTime() < now;
    }).length;

    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === 'pending').length,
      in_progress: jobs.filter((j) => j.status === 'in_progress').length,
      review: jobs.filter((j) => j.status === 'review').length,
      approved: jobs.filter((j) => j.status === 'approved').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      cancelled: jobs.filter((j) => j.status === 'cancelled').length,
      overdue,
    };
  },
});

// Get a single creative job
export const getCreativeJob = query({
  args: {
    jobId: v.id('creative_jobs'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const job = await ctx.db.get(args.jobId);

    if (!job) {
      return null;
    }

    // Enrich files with storage URLs
    const enrichedFiles = await Promise.all(
      job.files.map(async (file) => {
        if (file.storage_id && !file.url) {
          const url = await ctx.storage.getUrl(file.storage_id);
          return { ...file, url: url ?? undefined };
        }
        return file;
      })
    );

    return { ...job, files: enrichedFiles };
  },
});

// Create a new creative job
export const createCreativeJob = mutation({
  args: {
    weddingId: v.id('weddings'),
    type: v.union(
      v.literal('invitation'),
      v.literal('save_the_date'),
      v.literal('program'),
      v.literal('menu'),
      v.literal('place_card'),
      v.literal('table_number'),
      v.literal('signage'),
      v.literal('thank_you_card'),
      v.literal('website'),
      v.literal('photo_album'),
      v.literal('video'),
      v.literal('other')
    ),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('in_progress'),
        v.literal('review'),
        v.literal('approved'),
        v.literal('completed'),
        v.literal('cancelled')
      )
    ),
    priority: v.optional(
      v.union(
        v.literal('low'),
        v.literal('medium'),
        v.literal('high'),
        v.literal('urgent')
      )
    ),
    assigned_to: v.optional(v.string()),
    vendor_id: v.optional(v.id('vendors')),
    due_date: v.optional(v.string()),
    budget: v.optional(v.number()),
    actual_cost: v.optional(v.number()),
    feedback: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const now = Date.now();
    const jobId = await ctx.db.insert('creative_jobs', {
      weddingId: args.weddingId,
      type: args.type,
      title: args.title,
      description: args.description,
      status: args.status || 'pending',
      priority: args.priority || 'medium',
      assigned_to: args.assigned_to,
      vendor_id: args.vendor_id,
      due_date: args.due_date,
      completed_date: undefined,
      progress: 0,
      budget: args.budget,
      actual_cost: args.actual_cost,
      files: [],
      feedback: args.feedback,
      notes: args.notes,
      created_at: now,
      updated_at: now,
    });

    return jobId;
  },
});

// Update a creative job
export const updateCreativeJob = mutation({
  args: {
    jobId: v.id('creative_jobs'),
    type: v.optional(
      v.union(
        v.literal('invitation'),
        v.literal('save_the_date'),
        v.literal('program'),
        v.literal('menu'),
        v.literal('place_card'),
        v.literal('table_number'),
        v.literal('signage'),
        v.literal('thank_you_card'),
        v.literal('website'),
        v.literal('photo_album'),
        v.literal('video'),
        v.literal('other')
      )
    ),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('in_progress'),
        v.literal('review'),
        v.literal('approved'),
        v.literal('completed'),
        v.literal('cancelled')
      )
    ),
    priority: v.optional(
      v.union(
        v.literal('low'),
        v.literal('medium'),
        v.literal('high'),
        v.literal('urgent')
      )
    ),
    assigned_to: v.optional(v.string()),
    vendor_id: v.optional(v.id('vendors')),
    due_date: v.optional(v.string()),
    budget: v.optional(v.number()),
    actual_cost: v.optional(v.number()),
    feedback: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const { jobId, ...updates } = args;

    const job = await ctx.db.get(jobId);
    if (!job) {
      throw new Error('Creative job not found');
    }

    // Set completed_date if status is being changed to completed
    let completed_date = job.completed_date;
    if (updates.status === 'completed' && job.status !== 'completed') {
      completed_date = new Date().toISOString();
    } else if (updates.status && updates.status !== 'completed') {
      completed_date = undefined;
    }

    await ctx.db.patch(jobId, {
      ...updates,
      completed_date,
      updated_at: Date.now(),
    });

    return jobId;
  },
});

// Update progress percentage
export const updateProgress = mutation({
  args: {
    jobId: v.id('creative_jobs'),
    progress: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error('Creative job not found');
    }

    // Clamp progress between 0 and 100
    const progress = Math.min(100, Math.max(0, args.progress));

    await ctx.db.patch(args.jobId, {
      progress,
      updated_at: Date.now(),
    });

    return args.jobId;
  },
});

// Delete a creative job
export const deleteCreativeJob = mutation({
  args: {
    jobId: v.id('creative_jobs'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const job = await ctx.db.get(args.jobId);

    if (!job) {
      throw new Error('Creative job not found');
    }

    // Delete all files from storage
    for (const file of job.files) {
      if (file.storage_id) {
        await ctx.storage.delete(file.storage_id);
      }
    }

    await ctx.db.delete(args.jobId);
    return { success: true };
  },
});

// Add a file to a creative job
export const addFile = mutation({
  args: {
    jobId: v.id('creative_jobs'),
    file: v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
      storage_id: v.optional(v.id('_storage')),
      url: v.optional(v.string()),
      thumbnail_url: v.optional(v.string()),
      uploaded_at: v.number(),
      version: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error('Creative job not found');
    }

    // Generate URL if storage_id exists
    let fileWithUrl = args.file;
    if (args.file.storage_id && !args.file.url) {
      const url = await ctx.storage.getUrl(args.file.storage_id);
      fileWithUrl = { ...args.file, url: url ?? undefined };
    }

    await ctx.db.patch(args.jobId, {
      files: [...job.files, fileWithUrl],
      updated_at: Date.now(),
    });

    return args.jobId;
  },
});

// Remove a file from a creative job
export const removeFile = mutation({
  args: {
    jobId: v.id('creative_jobs'),
    fileId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error('Creative job not found');
    }

    // Find and delete from storage
    const fileToRemove = job.files.find((f) => f.id === args.fileId);
    if (fileToRemove?.storage_id) {
      await ctx.storage.delete(fileToRemove.storage_id);
    }

    // Remove from files array
    const updatedFiles = job.files.filter((f) => f.id !== args.fileId);

    await ctx.db.patch(args.jobId, {
      files: updatedFiles,
      updated_at: Date.now(),
    });

    return args.jobId;
  },
});

// Generate upload URL for file uploads
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.storage.generateUploadUrl();
  },
});

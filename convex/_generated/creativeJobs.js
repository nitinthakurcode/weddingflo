"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUploadUrl = exports.removeFile = exports.addFile = exports.deleteCreativeJob = exports.updateProgress = exports.updateCreativeJob = exports.createCreativeJob = exports.getCreativeJob = exports.getCreativeStats = exports.getCreativeJobsByStatus = exports.getCreativeJobsByWedding = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
// Get all creative jobs for a wedding
exports.getCreativeJobsByWedding = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const jobs = await ctx.db
            .query('creative_jobs')
            .withIndex('by_wedding', (q) => q.eq('weddingId', args.weddingId))
            .collect();
        return jobs;
    },
});
// Get creative jobs by status (for Kanban columns)
exports.getCreativeJobsByStatus = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
        status: values_1.v.union(values_1.v.literal('pending'), values_1.v.literal('in_progress'), values_1.v.literal('review'), values_1.v.literal('approved'), values_1.v.literal('completed'), values_1.v.literal('cancelled')),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const jobs = await ctx.db
            .query('creative_jobs')
            .withIndex('by_status', (q) => q.eq('weddingId', args.weddingId).eq('status', args.status))
            .collect();
        return jobs;
    },
});
// Get creative stats (counts by status)
exports.getCreativeStats = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.getCreativeJob = (0, server_1.query)({
    args: {
        jobId: values_1.v.id('creative_jobs'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const job = await ctx.db.get(args.jobId);
        if (!job) {
            return null;
        }
        // Enrich files with storage URLs
        const enrichedFiles = await Promise.all(job.files.map(async (file) => {
            if (file.storage_id && !file.url) {
                const url = await ctx.storage.getUrl(file.storage_id);
                return { ...file, url: url ?? undefined };
            }
            return file;
        }));
        return { ...job, files: enrichedFiles };
    },
});
// Create a new creative job
exports.createCreativeJob = (0, server_1.mutation)({
    args: {
        weddingId: values_1.v.id('weddings'),
        type: values_1.v.union(values_1.v.literal('invitation'), values_1.v.literal('save_the_date'), values_1.v.literal('program'), values_1.v.literal('menu'), values_1.v.literal('place_card'), values_1.v.literal('table_number'), values_1.v.literal('signage'), values_1.v.literal('thank_you_card'), values_1.v.literal('website'), values_1.v.literal('photo_album'), values_1.v.literal('video'), values_1.v.literal('other')),
        title: values_1.v.string(),
        description: values_1.v.optional(values_1.v.string()),
        status: values_1.v.optional(values_1.v.union(values_1.v.literal('pending'), values_1.v.literal('in_progress'), values_1.v.literal('review'), values_1.v.literal('approved'), values_1.v.literal('completed'), values_1.v.literal('cancelled'))),
        priority: values_1.v.optional(values_1.v.union(values_1.v.literal('low'), values_1.v.literal('medium'), values_1.v.literal('high'), values_1.v.literal('urgent'))),
        assigned_to: values_1.v.optional(values_1.v.string()),
        vendor_id: values_1.v.optional(values_1.v.id('vendors')),
        due_date: values_1.v.optional(values_1.v.string()),
        budget: values_1.v.optional(values_1.v.number()),
        actual_cost: values_1.v.optional(values_1.v.number()),
        feedback: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.updateCreativeJob = (0, server_1.mutation)({
    args: {
        jobId: values_1.v.id('creative_jobs'),
        type: values_1.v.optional(values_1.v.union(values_1.v.literal('invitation'), values_1.v.literal('save_the_date'), values_1.v.literal('program'), values_1.v.literal('menu'), values_1.v.literal('place_card'), values_1.v.literal('table_number'), values_1.v.literal('signage'), values_1.v.literal('thank_you_card'), values_1.v.literal('website'), values_1.v.literal('photo_album'), values_1.v.literal('video'), values_1.v.literal('other'))),
        title: values_1.v.optional(values_1.v.string()),
        description: values_1.v.optional(values_1.v.string()),
        status: values_1.v.optional(values_1.v.union(values_1.v.literal('pending'), values_1.v.literal('in_progress'), values_1.v.literal('review'), values_1.v.literal('approved'), values_1.v.literal('completed'), values_1.v.literal('cancelled'))),
        priority: values_1.v.optional(values_1.v.union(values_1.v.literal('low'), values_1.v.literal('medium'), values_1.v.literal('high'), values_1.v.literal('urgent'))),
        assigned_to: values_1.v.optional(values_1.v.string()),
        vendor_id: values_1.v.optional(values_1.v.id('vendors')),
        due_date: values_1.v.optional(values_1.v.string()),
        budget: values_1.v.optional(values_1.v.number()),
        actual_cost: values_1.v.optional(values_1.v.number()),
        feedback: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const { jobId, ...updates } = args;
        const job = await ctx.db.get(jobId);
        if (!job) {
            throw new Error('Creative job not found');
        }
        // Set completed_date if status is being changed to completed
        let completed_date = job.completed_date;
        if (updates.status === 'completed' && job.status !== 'completed') {
            completed_date = new Date().toISOString();
        }
        else if (updates.status && updates.status !== 'completed') {
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
exports.updateProgress = (0, server_1.mutation)({
    args: {
        jobId: values_1.v.id('creative_jobs'),
        progress: values_1.v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.deleteCreativeJob = (0, server_1.mutation)({
    args: {
        jobId: values_1.v.id('creative_jobs'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.addFile = (0, server_1.mutation)({
    args: {
        jobId: values_1.v.id('creative_jobs'),
        file: values_1.v.object({
            id: values_1.v.string(),
            name: values_1.v.string(),
            type: values_1.v.string(),
            size: values_1.v.number(),
            storage_id: values_1.v.optional(values_1.v.id('_storage')),
            url: values_1.v.optional(values_1.v.string()),
            thumbnail_url: values_1.v.optional(values_1.v.string()),
            uploaded_at: values_1.v.number(),
            version: values_1.v.number(),
        }),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.removeFile = (0, server_1.mutation)({
    args: {
        jobId: values_1.v.id('creative_jobs'),
        fileId: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.generateUploadUrl = (0, server_1.mutation)({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.storage.generateUploadUrl();
    },
});

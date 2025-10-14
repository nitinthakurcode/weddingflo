import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: { clientId: v.id('clients'), resolved: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    if (args.resolved !== undefined) {
      return await ctx.db
        .query('timeline_conflicts')
        .withIndex('by_client', (q) => q.eq('client_id', args.clientId).eq('resolved', args.resolved!))
        .collect();
    }

    const allConflicts = await ctx.db
      .query('timeline_conflicts')
      .filter((q) => q.eq(q.field('client_id'), args.clientId))
      .collect();

    return allConflicts;
  },
});

export const detectConflicts = mutation({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const eventFlows = await ctx.db
      .query('event_flow')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();

    const conflicts = [];
    const now = Date.now();

    for (let i = 0; i < eventFlows.length; i++) {
      for (let j = i + 1; j < eventFlows.length; j++) {
        const flow1 = eventFlows[i];
        const flow2 = eventFlows[j];

        if (flow1.date === flow2.date) {
          const start1 = parseTime(flow1.start_time);
          const end1 = start1 + flow1.duration_minutes;
          const start2 = parseTime(flow2.start_time);
          const end2 = start2 + flow2.duration_minutes;

          if (start1 < end2 && start2 < end1) {
            const existing = await ctx.db
              .query('timeline_conflicts')
              .filter((q) =>
                q.or(
                  q.and(
                    q.eq(q.field('event_flow_id_1'), flow1._id),
                    q.eq(q.field('event_flow_id_2'), flow2._id)
                  ),
                  q.and(
                    q.eq(q.field('event_flow_id_1'), flow2._id),
                    q.eq(q.field('event_flow_id_2'), flow1._id)
                  )
                )
              )
              .first();

            if (!existing) {
              const conflictId = await ctx.db.insert('timeline_conflicts', {
                client_id: args.clientId,
                event_flow_id_1: flow1._id,
                event_flow_id_2: flow2._id,
                conflict_type: 'time_overlap',
                severity: 'critical',
                description: `Time conflict between "${flow1.activity}" and "${flow2.activity}"`,
                resolved: false,
                created_at: now,
              });
              conflicts.push(conflictId);
            }
          }
        }
      }
    }

    return { detected: conflicts.length, conflicts };
  },
});

export const resolve = mutation({
  args: { conflictId: v.id('timeline_conflicts') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.patch(args.conflictId, {
      resolved: true,
      resolved_at: Date.now(),
    });
    return args.conflictId;
  },
});

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

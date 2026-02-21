/**
 * Team Router - February 2026
 *
 * Single Source of Truth: BetterAuth user table
 * Team Management for WeddingFlo
 * Manages team members within a company, invitations, role assignments, and client assignments.
 */

import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, count } from 'drizzle-orm';
import { user as userTable, teamClientAssignments, clients } from '@/lib/db/schema';
import { nanoid } from 'nanoid';

// Role enum for team members
const teamRoleSchema = z.enum(['company_admin', 'staff', 'client_user']);

export const teamRouter = router({
  /**
   * List all team members for the current company
   * Includes count of clients assigned to each team member
   */
  listTeamMembers: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.companyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Company ID not found in session',
      });
    }

    // Get all users in the company with client assignment counts
    const teamMembers = await ctx.db
      .select({
        id: userTable.id,
        email: userTable.email,
        name: userTable.name,
        firstName: userTable.firstName,
        lastName: userTable.lastName,
        avatarUrl: userTable.avatarUrl,
        image: userTable.image,
        role: userTable.role,
        isActive: userTable.isActive,
        createdAt: userTable.createdAt,
        updatedAt: userTable.updatedAt,
      })
      .from(userTable)
      .where(eq(userTable.companyId, ctx.companyId));

    // Get client assignment counts for each team member
    const memberIds = teamMembers.map((m) => m.id);

    let assignmentCounts: Record<string, number> = {};
    if (memberIds.length > 0) {
      const counts = await ctx.db
        .select({
          teamMemberId: teamClientAssignments.teamMemberId,
          count: count(),
        })
        .from(teamClientAssignments)
        .where(sql`${teamClientAssignments.teamMemberId} = ANY(${memberIds})`)
        .groupBy(teamClientAssignments.teamMemberId);

      assignmentCounts = counts.reduce(
        (acc, row) => {
          acc[row.teamMemberId] = Number(row.count);
          return acc;
        },
        {} as Record<string, number>
      );
    }

    return teamMembers.map((member) => ({
      ...member,
      avatarUrl: member.avatarUrl || member.image,
      authId: member.id, // For backward compatibility
      clientsAssigned: assignmentCounts[member.id] || 0,
    }));
  }),

  /**
   * Get a single team member by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const [member] = await ctx.db
        .select()
        .from(userTable)
        .where(and(eq(userTable.id, input.id), eq(userTable.companyId, ctx.companyId)))
        .limit(1);

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team member not found',
        });
      }

      // Get assigned clients
      const assignments = await ctx.db
        .select({
          clientId: teamClientAssignments.clientId,
          role: teamClientAssignments.role,
        })
        .from(teamClientAssignments)
        .where(eq(teamClientAssignments.teamMemberId, input.id));

      return {
        ...member,
        avatarUrl: member.avatarUrl || member.image,
        authId: member.id,
        assignedClients: assignments,
      };
    }),

  /**
   * Invite a new team member via email
   * Creates invitation record - user completes signup separately
   * TODO: Implement proper invitation flow with email token
   */
  invite: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().optional(),
        role: teamRoleSchema.default('staff'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // Check if user with this email already exists in the company
      const [existingUser] = await ctx.db
        .select({ id: userTable.id })
        .from(userTable)
        .where(and(eq(userTable.email, input.email), eq(userTable.companyId, ctx.companyId)))
        .limit(1);

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A team member with this email already exists',
        });
      }

      // Check if user exists globally (already signed up)
      const [globalUser] = await ctx.db
        .select({ id: userTable.id, companyId: userTable.companyId })
        .from(userTable)
        .where(eq(userTable.email, input.email))
        .limit(1);

      if (globalUser) {
        if (globalUser.companyId) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This user already belongs to another company',
          });
        }

        // User exists but has no company - assign them to this company
        await ctx.db
          .update(userTable)
          .set({
            companyId: ctx.companyId,
            role: input.role,
            firstName: input.firstName || null,
            lastName: input.lastName || null,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(userTable.id, globalUser.id));

        console.log(`[Team Router] Assigned existing user ${input.email} to company ${ctx.companyId}`);

        return {
          success: true,
          user: { id: globalUser.id, email: input.email },
          message: `${input.email} has been added to your team`,
        };
      }

      // User doesn't exist - TODO: Create invitation record and send email
      // For now, return a message indicating the user needs to sign up first
      console.log(`[Team Router] Invitation would be sent to ${input.email}`);

      return {
        success: true,
        user: null,
        message: `Invitation would be sent to ${input.email}. They need to sign up first, then you can add them.`,
        // TODO: Implement invitation flow with email token
      };
    }),

  /**
   * Update a team member's role
   */
  updateRole: adminProcedure
    .input(
      z.object({
        id: z.string(),
        role: teamRoleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // Cannot change own role (safety check)
      if (ctx.userId === input.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot change your own role',
        });
      }

      // Verify team member belongs to company
      const [member] = await ctx.db
        .select({ id: userTable.id })
        .from(userTable)
        .where(and(eq(userTable.id, input.id), eq(userTable.companyId, ctx.companyId)))
        .limit(1);

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team member not found',
        });
      }

      const [updated] = await ctx.db
        .update(userTable)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(userTable.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Toggle team member active status (enable/disable)
   */
  toggleActive: adminProcedure
    .input(
      z.object({
        id: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // Cannot deactivate self
      if (ctx.userId === input.id && !input.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot deactivate your own account',
        });
      }

      // Verify team member belongs to company
      const [member] = await ctx.db
        .select({ id: userTable.id })
        .from(userTable)
        .where(and(eq(userTable.id, input.id), eq(userTable.companyId, ctx.companyId)))
        .limit(1);

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team member not found',
        });
      }

      const [updated] = await ctx.db
        .update(userTable)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(userTable.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Remove a team member from the company (soft removal - clears companyId)
   */
  remove: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // Cannot remove self
      if (ctx.userId === input.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot remove yourself from the team',
        });
      }

      // Verify team member belongs to company
      const [member] = await ctx.db
        .select({ id: userTable.id })
        .from(userTable)
        .where(and(eq(userTable.id, input.id), eq(userTable.companyId, ctx.companyId)))
        .limit(1);

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team member not found',
        });
      }

      // Remove all client assignments first
      await ctx.db
        .delete(teamClientAssignments)
        .where(eq(teamClientAssignments.teamMemberId, input.id));

      // Soft remove: clear company association and deactivate
      await ctx.db
        .update(userTable)
        .set({
          companyId: null,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, input.id));

      return { success: true };
    }),

  /**
   * Assign a team member to clients
   */
  assignToClients: adminProcedure
    .input(
      z.object({
        teamMemberId: z.string(),
        clientIds: z.array(z.string()),
        role: z.string().default('assigned'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // Verify team member belongs to company
      const [member] = await ctx.db
        .select({ id: userTable.id })
        .from(userTable)
        .where(and(eq(userTable.id, input.teamMemberId), eq(userTable.companyId, ctx.companyId)))
        .limit(1);

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team member not found',
        });
      }

      // Verify all clients belong to company
      const companyClients = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.companyId, ctx.companyId),
            sql`${clients.id} = ANY(${input.clientIds})`
          )
        );

      const validClientIds = new Set(companyClients.map((c) => c.id));

      // Remove existing assignments for this team member
      await ctx.db
        .delete(teamClientAssignments)
        .where(eq(teamClientAssignments.teamMemberId, input.teamMemberId));

      // Create new assignments
      if (input.clientIds.length > 0) {
        const assignments = input.clientIds
          .filter((id) => validClientIds.has(id))
          .map((clientId) => ({
            id: nanoid(),
            teamMemberId: input.teamMemberId,
            clientId,
            role: input.role,
          }));

        if (assignments.length > 0) {
          await ctx.db.insert(teamClientAssignments).values(assignments);
        }
      }

      return { success: true, assignedCount: input.clientIds.length };
    }),

  /**
   * Get clients assigned to a specific team member
   */
  getAssignedClients: protectedProcedure
    .input(z.object({ teamMemberId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const assignments = await ctx.db
        .select({
          assignmentId: teamClientAssignments.id,
          clientId: teamClientAssignments.clientId,
          role: teamClientAssignments.role,
          client: {
            id: clients.id,
            partner1FirstName: clients.partner1FirstName,
            partner1LastName: clients.partner1LastName,
            partner2FirstName: clients.partner2FirstName,
            partner2LastName: clients.partner2LastName,
            weddingDate: clients.weddingDate,
            status: clients.status,
          },
        })
        .from(teamClientAssignments)
        .innerJoin(clients, eq(teamClientAssignments.clientId, clients.id))
        .where(
          and(
            eq(teamClientAssignments.teamMemberId, input.teamMemberId),
            eq(clients.companyId, ctx.companyId)
          )
        );

      return assignments;
    }),

  /**
   * Update team member profile (for self-update)
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().optional(),
        avatarUrl: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.firstName !== undefined) updateData.firstName = input.firstName;
      if (input.lastName !== undefined) updateData.lastName = input.lastName;
      if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;

      // Also update the combined name
      if (input.firstName !== undefined || input.lastName !== undefined) {
        const [currentUser] = await ctx.db
          .select({ firstName: userTable.firstName, lastName: userTable.lastName })
          .from(userTable)
          .where(eq(userTable.id, ctx.userId))
          .limit(1);

        const firstName = input.firstName ?? currentUser?.firstName ?? '';
        const lastName = input.lastName ?? currentUser?.lastName ?? '';
        updateData.name = [firstName, lastName].filter(Boolean).join(' ') || 'User';
      }

      const [updated] = await ctx.db
        .update(userTable)
        .set(updateData)
        .where(eq(userTable.id, ctx.userId))
        .returning();

      return updated;
    }),
});

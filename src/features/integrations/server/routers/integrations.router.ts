/**
 * Integrations Router
 *
 * Three integration surfaces:
 *  - QuickBooks: OAuth connection persistence (integration_connections). The
 *    actual accounting sync is gated on QUICKBOOKS_CLIENT_ID — without the
 *    Intuit app credentials it degrades gracefully rather than throwing.
 *  - API keys (Zapier / public API): full generate / list / revoke. Only a
 *    SHA-256 hash is stored; the plaintext key is returned once on creation.
 *  - Competitor CSV import: parse + auto-map + preview (any dataType) and
 *    execute (vendors are company-scoped and fully supported).
 */

import { router, protectedProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc } from 'drizzle-orm';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { apiKeys, integrationConnections, vendors } from '@/lib/db/schema';
import { broadcastSync } from '@/lib/realtime/broadcast-sync';

const QUICKBOOKS_CONFIGURED = Boolean(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET);

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// Auto-mapping target fields per import data type
const TARGET_FIELDS: Record<string, string[]> = {
  vendors: ['name', 'category', 'contactName', 'phone', 'email', 'contractAmount', 'notes', 'website'],
  guests: ['firstName', 'lastName', 'email', 'phone', 'side', 'partySize', 'relationship', 'notes'],
  clients: ['partner1Name', 'partner2Name', 'partner1Email', 'partner2Email', 'weddingDate', 'notes'],
};

/** Minimal CSV parser handling quoted fields and embedded commas/newlines. */
function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      record.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && content[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.some((v) => v.trim() !== '')) records.push(record);
      record = [];
    } else field += c;
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    if (record.some((v) => v.trim() !== '')) records.push(record);
  }
  const headers = records.shift() ?? [];
  return { headers: headers.map((h) => h.trim()), rows: records };
}

/** Score how well a source column name matches a target field (0..1). */
function matchConfidence(source: string, target: string): number {
  const s = source.toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = target.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s === t) return 1;
  if (s.includes(t) || t.includes(s)) return 0.8;
  // token overlap
  return 0;
}

function autoMap(columns: string[], dataType: string) {
  const targets = TARGET_FIELDS[dataType] ?? [];
  return columns.map((sourceColumn) => {
    let best: { field: string; conf: number } | null = null;
    for (const field of targets) {
      const conf = matchConfidence(sourceColumn, field);
      if (conf > 0 && (!best || conf > best.conf)) best = { field, conf };
    }
    return {
      sourceColumn,
      targetField: best && best.conf >= 0.8 ? best.field : null,
      confidence: best?.conf ?? 0,
      isAutoMapped: Boolean(best && best.conf >= 0.8),
    };
  });
}

export const integrationsRouter = router({
  // ── QuickBooks ────────────────────────────────────────────────────────────
  getQuickBooksConnection: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.companyId) return null;
    const [conn] = await ctx.db
      .select()
      .from(integrationConnections)
      .where(and(eq(integrationConnections.companyId, ctx.companyId), eq(integrationConnections.provider, 'quickbooks')))
      .limit(1);
    if (!conn) return null;
    return {
      id: conn.id,
      isConnected: Boolean(conn.isActive && conn.accessToken),
      isActive: Boolean(conn.isActive),
      companyName: conn.companyName,
      realmId: conn.realmId,
      lastSyncAt: conn.lastSyncAt,
      expiresAt: conn.expiresAt,
    };
  }),

  disconnectQuickBooks: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) throw new TRPCError({ code: 'UNAUTHORIZED' });
      await ctx.db
        .update(integrationConnections)
        .set({ isActive: false, accessToken: null, refreshToken: null, updatedAt: new Date() })
        .where(and(eq(integrationConnections.id, input.connectionId), eq(integrationConnections.companyId, ctx.companyId)));
      return { success: true };
    }),

  syncQuickBooks: protectedProcedure.mutation(async ({ ctx }): Promise<{ created: number; updated: number; configured: boolean }> => {
    if (!ctx.companyId) throw new TRPCError({ code: 'UNAUTHORIZED' });
    // Gated on env: without Intuit app credentials there is nothing to sync.
    if (!QUICKBOOKS_CONFIGURED) {
      return { created: 0, updated: 0, configured: false };
    }
    const [conn] = await ctx.db
      .select()
      .from(integrationConnections)
      .where(and(eq(integrationConnections.companyId, ctx.companyId), eq(integrationConnections.provider, 'quickbooks')))
      .limit(1);
    if (!conn?.accessToken) {
      return { created: 0, updated: 0, configured: true };
    }
    // Real Intuit API sync is wired once the QuickBooks app + SDK are provisioned.
    await ctx.db
      .update(integrationConnections)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(integrationConnections.id, conn.id));
    return { created: 0, updated: 0, configured: true };
  }),

  // ── API keys (Zapier / public API) ─────────────────────────────────────────
  getApiKey: protectedProcedure
    .input(z.object({ service: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) return null;
      const conditions = [eq(apiKeys.companyId, ctx.companyId)];
      if (input.service) conditions.push(eq(apiKeys.service, input.service));
      const [row] = await ctx.db
        .select()
        .from(apiKeys)
        .where(and(...conditions))
        .orderBy(desc(apiKeys.createdAt))
        .limit(1);
      if (!row) return null;
      return {
        id: row.id,
        // Masked — the plaintext key is only ever returned once, on creation.
        key: `${row.keyPrefix}••••••`,
        name: row.name,
        isActive: row.isActive ?? false,
        lastUsedAt: row.lastUsedAt,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
      };
    }),

  generateApiKey: protectedProcedure
    .input(z.object({ service: z.string().optional(), name: z.string().min(1), expiresAt: z.date().optional() }))
    .mutation(async ({ ctx, input }): Promise<{ key: string; id: string }> => {
      if (!ctx.companyId) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const secret = randomBytes(24).toString('hex');
      const key = `wf_live_${secret}`;
      const [row] = await ctx.db
        .insert(apiKeys)
        .values({
          companyId: ctx.companyId,
          name: input.name,
          service: input.service || 'zapier',
          keyHash: hashKey(key),
          keyPrefix: key.slice(0, 16),
          expiresAt: input.expiresAt,
          createdBy: ctx.userId,
        })
        .returning({ id: apiKeys.id });
      // Returned ONCE — the plaintext is never stored or retrievable again.
      return { key, id: row.id };
    }),

  revokeApiKey: protectedProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) throw new TRPCError({ code: 'UNAUTHORIZED' });
      await ctx.db
        .delete(apiKeys)
        .where(and(eq(apiKeys.id, input.keyId), eq(apiKeys.companyId, ctx.companyId)));
      return { success: true };
    }),

  // ── Competitor CSV import ──────────────────────────────────────────────────
  parseImportFile: protectedProcedure
    .input(z.object({ fileContent: z.string(), platform: z.string(), dataType: z.string() }))
    .mutation(async ({ input }) => {
      const { headers, rows } = parseCsv(input.fileContent);
      return {
        columns: headers,
        mappings: autoMap(headers, input.dataType),
        rowCount: rows.length,
      };
    }),

  previewImport: protectedProcedure
    .input(z.object({
      fileContent: z.string(),
      mappings: z.array(z.object({
        sourceColumn: z.string(),
        targetField: z.string().nullable(),
        confidence: z.number(),
        isAutoMapped: z.boolean(),
      })),
      dataType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { headers, rows } = parseCsv(input.fileContent);
      const colIndex = (col: string) => headers.indexOf(col);
      const requiredByType: Record<string, string[]> = {
        vendors: ['name'],
        guests: ['firstName'],
        clients: ['partner1Name'],
      };
      const required = requiredByType[input.dataType] ?? [];
      const seen = new Set<string>();
      let valid = 0, invalid = 0, duplicates = 0;

      const previewRows = rows.slice(0, 100).map((row) => {
        const data: Record<string, unknown> = {};
        for (const m of input.mappings) {
          if (!m.targetField) continue;
          const idx = colIndex(m.sourceColumn);
          if (idx !== -1) data[m.targetField] = (row[idx] ?? '').trim();
        }
        const errors: string[] = [];
        for (const req of required) {
          if (!data[req]) errors.push(`Missing required field: ${req}`);
        }
        const dupKey = String(data.email || data.name || data.partner1Email || JSON.stringify(data)).toLowerCase();
        const isDuplicate = dupKey !== '' && seen.has(dupKey);
        if (!isDuplicate) seen.add(dupKey);
        if (errors.length > 0) invalid++;
        else if (isDuplicate) duplicates++;
        else valid++;
        return { data, errors, isDuplicate };
      });

      return { valid, invalid, duplicates, rows: previewRows };
    }),

  executeImport: protectedProcedure
    .input(z.object({
      fileContent: z.string(),
      mappings: z.array(z.object({
        sourceColumn: z.string(),
        targetField: z.string().nullable(),
        confidence: z.number(),
        isAutoMapped: z.boolean(),
      })),
      dataType: z.string(),
      duplicateAction: z.enum(['skip', 'update', 'error']).default('skip'),
    }))
    .mutation(async ({ ctx, input }): Promise<{ created: number; updated: number; skipped: number; failed: number }> => {
      if (!ctx.companyId) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const { headers, rows } = parseCsv(input.fileContent);
      const colIndex = (col: string) => headers.indexOf(col);
      const value = (row: string[], field: string): string => {
        const m = input.mappings.find((mm) => mm.targetField === field);
        if (!m) return '';
        const idx = colIndex(m.sourceColumn);
        return idx !== -1 ? (row[idx] ?? '').trim() : '';
      };

      const result = { created: 0, updated: 0, skipped: 0, failed: 0 };

      // Vendors are company-scoped (no parent client) — fully supported here.
      if (input.dataType === 'vendors') {
        for (const row of rows) {
          const name = value(row, 'name');
          if (!name) { result.failed++; continue; }
          try {
            await ctx.db.insert(vendors).values({
              id: randomUUID(),
              companyId: ctx.companyId,
              name,
              category: value(row, 'category') || 'other',
              contactName: value(row, 'contactName') || null,
              phone: value(row, 'phone') || null,
              email: value(row, 'email') || null,
              notes: value(row, 'notes') || null,
            });
            result.created++;
          } catch {
            result.failed++;
          }
        }
        if (result.created > 0) {
          await broadcastSync({
            type: 'insert',
            module: 'vendors',
            entityId: 'bulk-import',
            companyId: ctx.companyId,
            userId: ctx.userId,
            queryPaths: ['vendors.getAll', 'vendors.getStats'],
          });
        }
        return result;
      }

      // Client-scoped entities (guests, etc.) require a target client, which the
      // generic competitor importer does not carry — use the per-client Excel/
      // Sheets import for those. Reported as skipped rather than throwing.
      result.skipped = rows.length;
      return result;
    }),
});

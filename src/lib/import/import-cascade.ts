/**
 * Centralized spreadsheet-import "how" (service layer, Cluster R).
 *
 * Spreadsheet ingest was reimplemented per-call-site (canonical buffer parsers, inline
 * Excel importers, Google-Sheets importers), so each copy re-decided sheet selection and
 * which cascades fire — and they drifted (B1 sheet-select, P1/I1 missing recalcs). These
 * helpers are the single source for the parts that drifted, so a future import caller
 * cannot forget them:
 *
 *   • selectModuleWorksheet  — pick a module's worksheet by its canonical NAME (never the
 *     generic "first non-instructions sheet", which matched the combined export's Cover). [B1]
 *   • INLINE_IMPORT_VALIDATION — the per-module sheet + required headers the inline Excel
 *     path must validate up front (mirrors the canonical buffer parsers' validateExcelFile). [D1]
 *   • runImportRecalcCascade — the canonical per-module recalc set (client stats + per-guest
 *     budget). Excel AND Sheets importers route through this, so neither can omit a recalc. [P1/I1]
 *
 * Callers keep the "when/auth" (router tenant checks, transaction boundaries); this owns the
 * reusable "how".
 */
import type { Workbook, Worksheet } from 'exceljs'
import { recalcClientStats } from '@/lib/sync/client-stats-sync'
import { recalcPerGuestBudgetItems } from '@/features/budget/server/utils/per-guest-recalc'

export type ImportModule =
  | 'guests' | 'vendors' | 'budget' | 'gifts' | 'hotels' | 'transport' | 'guestGifts' | 'events'

/** db | tx — same permissive client the recalc helpers accept (kept in sync via Parameters). */
type DbOrTx = Parameters<typeof recalcClientStats>[0]

/**
 * The canonical worksheet NAME each module is exported/templated under. Both the combined
 * client export (export-utils.ts) and downloadTemplate use these exact names.
 */
export const MODULE_SHEET_NAME: Record<ImportModule, string> = {
  guests: 'Guests',
  vendors: 'Vendors',
  budget: 'Budget',
  gifts: 'Gifts',
  hotels: 'Hotels',
  transport: 'Transport',
  guestGifts: 'GiftsGiven',
  events: 'Events',
}

/**
 * Select the worksheet for `module` by its canonical name. Falls back to the first
 * data-bearing sheet that is NOT the instructions or Cover sheet (single-sheet templates /
 * legacy uploads). Returns null only for an empty workbook.
 *
 * [B1] The previous inline logic took the first non-INSTRUCTIONS sheet, which in the combined
 * export is "Cover" — so a combined-export round-trip silently parsed Cover and no-oped.
 */
export function selectModuleWorksheet(workbook: Workbook, module: ImportModule): Worksheet | null {
  const named = workbook.getWorksheet(MODULE_SHEET_NAME[module])
  if (named) return named

  const isSkippable = (ws: Worksheet) =>
    ws.name.includes('INSTRUCTIONS') || ws.name.includes('READ FIRST') || ws.name === 'Cover'

  return (
    workbook.worksheets.find((ws) => !isSkippable(ws)) ??
    workbook.worksheets.find((ws) => ws.rowCount > 1) ??
    workbook.worksheets[0] ??
    null
  )
}

/**
 * Per-module upfront validation for the INLINE Excel importers (guests / gifts / guestGifts),
 * mirroring the canonical buffer parsers which all call validateExcelFile first. The router
 * passes these to validateExcelFile(buffer, expected, required, sheet) before parsing.
 *
 * [D1] required is the module's name column so a malformed/wrong-sheet upload is rejected up
 * front (CLAUDE rule 28) — and so the Cluster-E combined "Gifts" sheet (sourced from
 * guest_gifts, header "Gift Item", no "Gift Name") is rejected cleanly instead of importing
 * mis-shaped rows into the gifts table.
 */
export const INLINE_IMPORT_VALIDATION: Record<
  'guests' | 'gifts' | 'guestGifts',
  { sheet: string; expected: string[]; required: string[] }
> = {
  guests: {
    sheet: 'Guests',
    expected: ['ID', 'Name', 'Email', 'Phone', 'Group', 'Side', 'RSVP Status'],
    required: ['Name'],
  },
  gifts: {
    sheet: 'Gifts',
    expected: ['ID', 'Gift Name', 'Value', 'Status', 'Guest Name'],
    required: ['Gift Name'],
  },
  guestGifts: {
    sheet: 'GiftsGiven',
    expected: ['ID', 'Guest Name', 'Gift Name', 'Quantity'],
    required: ['Guest Name', 'Gift Name'],
  },
}

/**
 * Fire the canonical post-import recalc cascade for a module. SINGLE SOURCE OF TRUTH so the
 * Excel and Sheets import paths can't drift on which recalcs run:
 *
 *   guests / budget → recalcClientStats + recalcPerGuestBudgetItems
 *   vendors         → recalcClientStats (vendor costs feed client budget totals)
 *   hotels / transport / events / gifts / guestGifts → none (no client-stat / per-guest coupling)
 *
 * [P1] the Sheets guest import previously ran recalcClientStats but not recalcPerGuestBudgetItems.
 * [I1] the single-module Sheets vendor import previously ran neither.
 *
 * Returns the number of per-guest budget items updated (for the import's cascade-action report).
 */
export async function runImportRecalcCascade(
  db: DbOrTx,
  module: ImportModule,
  clientId: string,
): Promise<{ perGuestBudgetUpdated: number }> {
  if (module === 'guests' || module === 'budget' || module === 'vendors') {
    await recalcClientStats(db, clientId)
  }

  if (module === 'guests' || module === 'budget') {
    const { updatedItems } = await recalcPerGuestBudgetItems(db, clientId)
    return { perGuestBudgetUpdated: updatedItems }
  }

  return { perGuestBudgetUpdated: 0 }
}

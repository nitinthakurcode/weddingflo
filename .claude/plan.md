# Audit Plan: Post-Remediation Verification (Session 2)

## Overview
Read-only audit of all schema remediation work (Prompts 1-9). No source files will be modified — only a final report created.

## Steps

### Step 1: `npx drizzle-kit check`
- Run and report output verbatim

### Step 2: `npx jest --passWithNoTests`
- Report pass/fail/total counts

### Step 3: `npx drizzle-kit generate --name=drift-check`
- If empty migration → schema matches DB expectations
- If non-empty → report every change with assessment (expected vs concerning)
- Delete generated migration file after review

### Step 4: Grep checks
- companyId definitions in schema-features.ts (verify .notNull() correctness)
- @deprecated markers in schema files
- Relation count in schema-relations.ts

### Step 5: Security tests
- `npx jest tests/security/ --passWithNoTests`

### Step 6: Create report
- `docs/session-2-remediation-report.md` with:
  - All issues fixed (ID, before/after)
  - Files modified across all prompts
  - Remaining deployment items
  - Pre-deployment checklist

## Constraints
- NO source file modifications (only the report)
- Delete drift-check migration after review
- Report concerns, don't fix them

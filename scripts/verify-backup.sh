#!/bin/bash

# Backup Verification Script for WeddingFlo
# April 2026
#
# Verifies the most recent backup by:
# 1. Downloading latest backup from R2
# 2. Restoring to a temporary database
# 3. Running integrity checks (table count, key table row counts)
# 4. Dropping the temporary database
# 5. Reporting pass/fail
#
# Usage: ./scripts/verify-backup.sh
#
# Required environment variables: same as backup-postgres.sh

set -euo pipefail

# Configuration
TEMP_DB="weddingflo_verify_$(date +%s)"
BACKUP_DIR="${BACKUP_DIR:-/tmp/weddingflo-backups}"
VERIFY_DIR="${BACKUP_DIR}/verify"

# Database connection
HOST="${POSTGRES_HOST:-localhost}"
PORT="${POSTGRES_PORT:-5432}"
USER="${POSTGRES_USER:-weddingflo}"
DB="${POSTGRES_DB:-weddingflo}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

cleanup() {
  log_info "Cleaning up..."
  # Drop temp database
  psql -h "$HOST" -p "$PORT" -U "$USER" -d postgres -c "DROP DATABASE IF EXISTS ${TEMP_DB};" 2>/dev/null || true
  # Remove downloaded backup
  rm -rf "$VERIFY_DIR"
}

trap cleanup EXIT

# Step 1: Find latest local backup or download from R2
mkdir -p "$VERIFY_DIR"
LATEST_BACKUP=""

# Try local backups first
if [ -d "$BACKUP_DIR" ]; then
  LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/weddingflo_*.sql.gz 2>/dev/null | head -1 || true)
fi

# If no local backup, try R2
if [ -z "$LATEST_BACKUP" ] && [ -n "${R2_ACCOUNT_ID:-}" ]; then
  log_info "No local backup found, checking R2..."
  r2_endpoint="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

  LATEST_R2=$(aws s3 ls "s3://${R2_BUCKET_NAME}/backups/" \
    --endpoint-url "$r2_endpoint" 2>/dev/null | sort | tail -1 | awk '{print $4}' || true)

  if [ -n "$LATEST_R2" ]; then
    LATEST_BACKUP="${VERIFY_DIR}/${LATEST_R2}"
    log_info "Downloading ${LATEST_R2} from R2..."
    aws s3 cp "s3://${R2_BUCKET_NAME}/backups/${LATEST_R2}" "$LATEST_BACKUP" \
      --endpoint-url "$r2_endpoint"
  fi
fi

if [ -z "$LATEST_BACKUP" ] || [ ! -f "$LATEST_BACKUP" ]; then
  log_error "No backup found to verify"
  exit 1
fi

log_info "Verifying backup: $(basename "$LATEST_BACKUP")"

# Step 2: Verify gzip integrity
log_info "Checking gzip integrity..."
if ! gzip -t "$LATEST_BACKUP" 2>/dev/null; then
  log_error "FAIL: Backup file is corrupt (gzip integrity check failed)"
  exit 1
fi
log_info "Gzip integrity: PASS"

# Step 3: Create temp database and restore
log_info "Creating temporary database: ${TEMP_DB}"
psql -h "$HOST" -p "$PORT" -U "$USER" -d postgres -c "CREATE DATABASE ${TEMP_DB};"

log_info "Restoring backup to temp database..."
if ! gunzip -c "$LATEST_BACKUP" | psql -h "$HOST" -p "$PORT" -U "$USER" -d "$TEMP_DB" --quiet 2>/dev/null; then
  log_error "FAIL: Restore failed"
  exit 1
fi
log_info "Restore: PASS"

# Step 4: Run integrity checks
log_info "Running integrity checks..."

# Count tables
TABLE_COUNT=$(psql -h "$HOST" -p "$PORT" -U "$USER" -d "$TEMP_DB" -t -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' ')

if [ "$TABLE_COUNT" -lt 10 ]; then
  log_error "FAIL: Only ${TABLE_COUNT} tables found (expected 10+)"
  exit 1
fi
log_info "Table count: ${TABLE_COUNT} (PASS)"

# Check key tables have data
CHECKS_PASSED=0
CHECKS_TOTAL=0

check_table() {
  local table=$1
  local min_rows=${2:-0}
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))

  local count
  count=$(psql -h "$HOST" -p "$PORT" -U "$USER" -d "$TEMP_DB" -t -c \
    "SELECT count(*) FROM ${table};" 2>/dev/null | tr -d ' ' || echo "0")

  if [ "$count" -ge "$min_rows" ]; then
    log_info "  ${table}: ${count} rows (PASS)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    log_warn "  ${table}: ${count} rows (expected >= ${min_rows})"
  fi
}

# Verify critical tables exist and have expected minimum row counts
check_table "\"user\"" 1          # At least 1 user
check_table "company" 1           # At least 1 company
check_table "session" 0           # Sessions may be empty
check_table "clients" 0           # Clients may be empty in staging
check_table "guests" 0
check_table "budget" 0
check_table "events" 0
check_table "vendors" 0

log_info "Integrity checks: ${CHECKS_PASSED}/${CHECKS_TOTAL} passed"

# Step 5: Final report
BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
BACKUP_AGE_HOURS=$(( ($(date +%s) - $(stat -f %m "$LATEST_BACKUP" 2>/dev/null || stat -c %Y "$LATEST_BACKUP" 2>/dev/null)) / 3600 ))

echo ""
echo "============================================"
echo "  BACKUP VERIFICATION REPORT"
echo "============================================"
echo "  File:       $(basename "$LATEST_BACKUP")"
echo "  Size:       ${BACKUP_SIZE}"
echo "  Age:        ${BACKUP_AGE_HOURS} hours"
echo "  Tables:     ${TABLE_COUNT}"
echo "  Checks:     ${CHECKS_PASSED}/${CHECKS_TOTAL} passed"
echo "  Status:     $([ "$CHECKS_PASSED" -eq "$CHECKS_TOTAL" ] && echo "✓ ALL PASS" || echo "⚠ PARTIAL")"
echo "============================================"

if [ "$CHECKS_PASSED" -eq "$CHECKS_TOTAL" ]; then
  exit 0
else
  exit 1
fi

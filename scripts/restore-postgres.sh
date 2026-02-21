#!/bin/bash

# PostgreSQL Restore Script for WeddingFlo
# Security February 2026
#
# This script:
# 1. Downloads backup from Cloudflare R2
# 2. Verifies backup integrity
# 3. Restores to PostgreSQL
# 4. Validates restoration
#
# Usage: ./scripts/restore-postgres.sh [backup_filename]
#
# Required environment variables:
# - POSTGRES_HOST
# - POSTGRES_PORT (default: 5432)
# - POSTGRES_DB
# - POSTGRES_USER
# - PGPASSWORD or POSTGRES_PASSWORD
# - R2_ACCOUNT_ID (optional, for R2 download)
# - R2_ACCESS_KEY_ID
# - R2_SECRET_ACCESS_KEY
# - R2_BUCKET_NAME

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/tmp/weddingflo-backups}"
BACKUP_FILENAME="${1:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check required environment variables
check_env() {
  local required_vars=("POSTGRES_HOST" "POSTGRES_DB" "POSTGRES_USER")
  local missing_vars=()

  for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
      missing_vars+=("$var")
    fi
  done

  # Check for password
  if [ -z "${PGPASSWORD:-}" ] && [ -z "${POSTGRES_PASSWORD:-}" ]; then
    missing_vars+=("PGPASSWORD or POSTGRES_PASSWORD")
  fi

  # Set PGPASSWORD if not set
  if [ -z "${PGPASSWORD:-}" ] && [ -n "${POSTGRES_PASSWORD:-}" ]; then
    export PGPASSWORD="${POSTGRES_PASSWORD}"
  fi

  if [ ${#missing_vars[@]} -gt 0 ]; then
    log_error "Missing required environment variables: ${missing_vars[*]}"
    exit 1
  fi
}

# List available backups
list_backups() {
  log_info "Listing available backups..."

  # List local backups
  log_info "Local backups:"
  if [ -d "$BACKUP_DIR" ]; then
    ls -lh "${BACKUP_DIR}"/weddingflo_*.sql.gz 2>/dev/null || echo "  No local backups found"
  else
    echo "  Backup directory not found"
  fi

  # List R2 backups
  if [ -n "${R2_ACCOUNT_ID:-}" ] && [ -n "${R2_BUCKET_NAME:-}" ]; then
    log_info "R2 backups:"
    export AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
    export AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
    local r2_endpoint="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

    aws s3 ls "s3://${R2_BUCKET_NAME}/backups/" \
      --endpoint-url "${r2_endpoint}" 2>/dev/null || echo "  Could not list R2 backups"
  fi
}

# Download backup from R2
download_from_r2() {
  local filename="$1"

  if [ -z "${R2_ACCOUNT_ID:-}" ] || [ -z "${R2_BUCKET_NAME:-}" ]; then
    log_error "R2 credentials not configured"
    exit 1
  fi

  log_info "Downloading backup from R2: ${filename}"

  export AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
  export AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
  export AWS_DEFAULT_REGION="auto"

  local r2_endpoint="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
  local local_path="${BACKUP_DIR}/${filename}"

  # Create backup directory if needed
  mkdir -p "${BACKUP_DIR}"

  aws s3 cp "s3://${R2_BUCKET_NAME}/backups/${filename}" "${local_path}" \
    --endpoint-url "${r2_endpoint}"

  if [ $? -eq 0 ]; then
    log_info "Downloaded: ${local_path}"
    echo "${local_path}"
  else
    log_error "Failed to download backup from R2"
    exit 1
  fi
}

# Verify backup integrity
verify_backup() {
  local backup_path="$1"

  log_info "Verifying backup integrity: ${backup_path}"

  # Check file exists
  if [ ! -f "${backup_path}" ]; then
    log_error "Backup file not found: ${backup_path}"
    exit 1
  fi

  # Check gzip integrity
  if ! gzip -t "${backup_path}" 2>/dev/null; then
    log_error "Backup file is corrupted (gzip integrity check failed)"
    exit 1
  fi

  # Check content
  if ! zcat "${backup_path}" | head -100 | grep -q "PostgreSQL database dump"; then
    log_warn "Backup may not be a valid PostgreSQL dump"
  fi

  local backup_size=$(du -h "${backup_path}" | cut -f1)
  log_info "Backup verified: ${backup_size}"
}

# Confirm restore
confirm_restore() {
  log_warn "=========================================="
  log_warn "         DESTRUCTIVE OPERATION"
  log_warn "=========================================="
  log_warn "This will DROP and recreate the database:"
  log_warn "  Database: ${POSTGRES_DB}"
  log_warn "  Host: ${POSTGRES_HOST}:${POSTGRES_PORT:-5432}"
  log_warn "=========================================="
  echo ""
  read -p "Type 'RESTORE' to confirm: " confirmation

  if [ "$confirmation" != "RESTORE" ]; then
    log_error "Restore cancelled"
    exit 1
  fi
}

# Stop application connections
stop_connections() {
  log_info "Terminating existing database connections..."

  psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER}" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
    2>/dev/null || true
}

# Restore database
restore_database() {
  local backup_path="$1"

  log_info "Starting database restore..."

  # Drop and recreate database
  log_info "Dropping existing database..."
  psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER}" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"

  log_info "Creating new database..."
  psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER}" \
    -d postgres \
    -c "CREATE DATABASE ${POSTGRES_DB};"

  # Restore from backup
  log_info "Restoring from backup..."
  zcat "${backup_path}" | psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --quiet

  log_info "Database restored successfully"
}

# Validate restoration
validate_restore() {
  log_info "Validating restoration..."

  # Check if we can connect
  if ! psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "Cannot connect to restored database"
    exit 1
  fi

  # Count tables
  local table_count=$(psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

  log_info "Tables restored: ${table_count}"

  # Check critical tables
  local critical_tables=("user" "session" "company" "client")
  for table in "${critical_tables[@]}"; do
    local exists=$(psql \
      -h "${POSTGRES_HOST}" \
      -p "${POSTGRES_PORT:-5432}" \
      -U "${POSTGRES_USER}" \
      -d "${POSTGRES_DB}" \
      -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = '${table}');")

    if [[ "$exists" == *"t"* ]]; then
      local count=$(psql \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT:-5432}" \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        -t -c "SELECT COUNT(*) FROM \"${table}\";")
      log_info "  ${table}: ${count} rows"
    else
      log_warn "  ${table}: NOT FOUND"
    fi
  done

  log_info "Validation completed"
}

# Main execution
main() {
  log_info "=== WeddingFlo PostgreSQL Restore ==="

  check_env

  # If no filename provided, list available backups
  if [ -z "$BACKUP_FILENAME" ]; then
    list_backups
    echo ""
    log_info "Usage: $0 <backup_filename>"
    log_info "Example: $0 weddingflo_2026-02-21_02-00-00.sql.gz"
    exit 0
  fi

  local backup_path=""

  # Check if local file exists
  if [ -f "${BACKUP_DIR}/${BACKUP_FILENAME}" ]; then
    backup_path="${BACKUP_DIR}/${BACKUP_FILENAME}"
    log_info "Using local backup: ${backup_path}"
  elif [ -f "${BACKUP_FILENAME}" ]; then
    backup_path="${BACKUP_FILENAME}"
    log_info "Using provided path: ${backup_path}"
  else
    # Try to download from R2
    backup_path=$(download_from_r2 "${BACKUP_FILENAME}")
  fi

  verify_backup "${backup_path}"
  confirm_restore
  stop_connections
  restore_database "${backup_path}"
  validate_restore

  log_info "=== Restore completed successfully ==="
}

main "$@"

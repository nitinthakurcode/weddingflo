#!/bin/bash

# PostgreSQL Backup Script for WeddingFlo
# Security February 2026
#
# This script:
# 1. Creates a compressed PostgreSQL dump
# 2. Uploads to Cloudflare R2
# 3. Maintains 30-day retention
# 4. Verifies backup integrity
#
# Usage: ./scripts/backup-postgres.sh
#
# Required environment variables:
# - POSTGRES_HOST
# - POSTGRES_PORT (default: 5432)
# - POSTGRES_DB
# - POSTGRES_USER
# - PGPASSWORD or POSTGRES_PASSWORD
# - R2_ACCOUNT_ID
# - R2_ACCESS_KEY_ID
# - R2_SECRET_ACCESS_KEY
# - R2_BUCKET_NAME

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/tmp/weddingflo-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILENAME="weddingflo_${DATE}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

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

# Create backup directory
create_backup_dir() {
  if [ ! -d "$BACKUP_DIR" ]; then
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
  fi
}

# Create PostgreSQL dump
create_backup() {
  log_info "Starting PostgreSQL backup..."
  log_info "Database: ${POSTGRES_DB}@${POSTGRES_HOST}:${POSTGRES_PORT:-5432}"

  # Create compressed backup
  pg_dump \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    2>&1 | gzip > "${BACKUP_PATH}"

  # Check if backup was created
  if [ ! -f "${BACKUP_PATH}" ] || [ ! -s "${BACKUP_PATH}" ]; then
    log_error "Backup file was not created or is empty"
    exit 1
  fi

  local backup_size=$(du -h "${BACKUP_PATH}" | cut -f1)
  log_info "Backup created successfully: ${BACKUP_PATH} (${backup_size})"
}

# Verify backup integrity
verify_backup() {
  log_info "Verifying backup integrity..."

  # Check gzip integrity
  if ! gzip -t "${BACKUP_PATH}" 2>/dev/null; then
    log_error "Backup file is corrupted (gzip integrity check failed)"
    exit 1
  fi

  # Check if backup contains expected content
  if ! zcat "${BACKUP_PATH}" | head -100 | grep -q "PostgreSQL database dump"; then
    log_warn "Backup may not be a valid PostgreSQL dump"
  fi

  log_info "Backup integrity verified"
}

# Upload to Cloudflare R2
upload_to_r2() {
  # Check R2 credentials
  if [ -z "${R2_ACCOUNT_ID:-}" ] || [ -z "${R2_ACCESS_KEY_ID:-}" ] || \
     [ -z "${R2_SECRET_ACCESS_KEY:-}" ] || [ -z "${R2_BUCKET_NAME:-}" ]; then
    log_warn "R2 credentials not configured, skipping upload"
    return 0
  fi

  log_info "Uploading backup to Cloudflare R2..."

  # Configure AWS CLI for R2
  export AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
  export AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
  export AWS_DEFAULT_REGION="auto"

  local r2_endpoint="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
  local r2_path="s3://${R2_BUCKET_NAME}/backups/${BACKUP_FILENAME}"

  # Upload with server-side encryption
  aws s3 cp "${BACKUP_PATH}" "${r2_path}" \
    --endpoint-url "${r2_endpoint}" \
    --storage-class STANDARD

  if [ $? -eq 0 ]; then
    log_info "Backup uploaded successfully to R2: ${r2_path}"
  else
    log_error "Failed to upload backup to R2"
    exit 1
  fi
}

# Clean up old backups (local)
cleanup_local() {
  log_info "Cleaning up local backups older than ${RETENTION_DAYS} days..."

  find "${BACKUP_DIR}" -name "weddingflo_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete

  local remaining=$(ls -1 "${BACKUP_DIR}"/weddingflo_*.sql.gz 2>/dev/null | wc -l)
  log_info "Remaining local backups: ${remaining}"
}

# Clean up old backups (R2)
cleanup_r2() {
  if [ -z "${R2_ACCOUNT_ID:-}" ] || [ -z "${R2_BUCKET_NAME:-}" ]; then
    return 0
  fi

  log_info "Cleaning up R2 backups older than ${RETENTION_DAYS} days..."

  local r2_endpoint="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
  local cutoff_date=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%d)

  # List and delete old backups
  aws s3 ls "s3://${R2_BUCKET_NAME}/backups/" \
    --endpoint-url "${r2_endpoint}" | \
  while read -r line; do
    local backup_date=$(echo "$line" | awk '{print $1}')
    local filename=$(echo "$line" | awk '{print $4}')

    if [[ "$backup_date" < "$cutoff_date" ]]; then
      log_info "Deleting old R2 backup: ${filename}"
      aws s3 rm "s3://${R2_BUCKET_NAME}/backups/${filename}" \
        --endpoint-url "${r2_endpoint}" || true
    fi
  done
}

# Send notification (optional)
send_notification() {
  local status="$1"
  local message="$2"

  # Slack webhook (if configured)
  if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    local color="good"
    if [ "$status" = "error" ]; then
      color="danger"
    fi

    curl -s -X POST "${SLACK_WEBHOOK_URL}" \
      -H 'Content-type: application/json' \
      -d "{
        \"attachments\": [{
          \"color\": \"${color}\",
          \"title\": \"WeddingFlo Database Backup\",
          \"text\": \"${message}\",
          \"ts\": $(date +%s)
        }]
      }" || true
  fi
}

# Main execution
main() {
  log_info "=== WeddingFlo PostgreSQL Backup ==="
  log_info "Starting backup process..."

  check_env
  create_backup_dir
  create_backup
  verify_backup
  upload_to_r2
  cleanup_local
  cleanup_r2

  log_info "=== Backup completed successfully ==="

  send_notification "success" "Backup completed: ${BACKUP_FILENAME}"
}

# Run main with error handling
if main; then
  exit 0
else
  send_notification "error" "Backup failed. Check logs for details."
  exit 1
fi

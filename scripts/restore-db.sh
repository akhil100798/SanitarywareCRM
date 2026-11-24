#!/usr/bin/env bash
# ==============================================================================
# Sanitaryware CRM — Disaster Recovery Database Restore Script
# Validates checksum integrity and restores a compressed (.sql.gz) snapshot into MySQL.
#
# Usage:
#   ./scripts/restore-db.sh <backup-file.sql.gz> --yes
#
# Configurable Environment Variables:
#   DB_HOST           MySQL host (default: 127.0.0.1)
#   DB_PORT           MySQL port (default: 3306)
#   DB_NAME           Target database name (default: sanitaryware_crm)
#   DB_USER           MySQL username (default: crm_user)
#   DB_PASS           MySQL password (default: empty or from MYSQL_PASSWORD)
#   MYSQL_CONTAINER   Docker container name if using container exec (default: sanitarywarecrm-mysql-1)
#   RESTORE_MODE      'docker' (exec inside container) or 'host' (direct mysql client) (default: auto-detect)
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path/to/backup.sql.gz> [--yes]" >&2
  echo "Example: $0 backups/sanitaryware_crm_20261124_120000.sql.gz --yes" >&2
  exit 1
fi

BACKUP_FILE="$1"
CONFIRM_FLAG="${2:-}"

# Check for explicit confirmation flag
if [ "${CONFIRM_FLAG}" != "--yes" ] && [ "${CONFIRM_FLAG}" != "-y" ]; then
  echo "==========================================================" >&2
  echo "CRITICAL WARNING: Database restore will overwrite target data!" >&2
  echo "To proceed, pass the explicit confirmation flag '--yes'." >&2
  echo "Usage: $0 \"${BACKUP_FILE}\" --yes" >&2
  echo "==========================================================" >&2
  exit 2
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

if [ ! -s "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file is empty: ${BACKUP_FILE}" >&2
  exit 1
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-${MYSQL_DATABASE:-sanitaryware_crm}}"
DB_USER="${DB_USER:-${MYSQL_USER:-crm_user}}"
DB_PASS="${DB_PASS:-${MYSQL_PASSWORD:-}}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-sanitarywarecrm-mysql-1}"

# Auto-detect restore mode
if [ -z "${RESTORE_MODE:-}" ]; then
  if command -v docker > /dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
    RESTORE_MODE="docker"
  else
    RESTORE_MODE="host"
  fi
fi

echo "=========================================================="
echo "Sanitaryware CRM: Disaster Recovery Database Restore"
echo "Backup File: ${BACKUP_FILE}"
echo "Target DB:   ${DB_NAME}"
echo "Mode:        ${RESTORE_MODE}"
echo "=========================================================="

# Check and verify SHA-256 checksum if available
SHA_FILE="${BACKUP_FILE}.sha256"
if [ -f "${SHA_FILE}" ]; then
  echo "Verifying SHA-256 integrity checksum..."
  DIR="$(dirname "${BACKUP_FILE}")"
  FILE="$(basename "${BACKUP_FILE}")"
  if command -v sha256sum > /dev/null 2>&1; then
    (cd "${DIR}" && sha256sum -c "$(basename "${SHA_FILE}")")
  elif command -v shasum > /dev/null 2>&1; then
    (cd "${DIR}" && shasum -a 256 -c "$(basename "${SHA_FILE}")")
  fi
  echo "Checksum verification PASSED."
else
  echo "NOTICE: No companion .sha256 file found. Proceeding with restore."
fi

START_TIME=$(date +%s)

echo "Decompressing and streaming restore into MySQL..."
if [ "${RESTORE_MODE}" = "docker" ]; then
  gzip -dc "${BACKUP_FILE}" | docker exec -i "${MYSQL_CONTAINER}" mysql \
    -u "${DB_USER}" \
    -p"${DB_PASS}" \
    "${DB_NAME}"
else
  gzip -dc "${BACKUP_FILE}" | mysql \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -p"${DB_PASS}" \
    "${DB_NAME}"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "=========================================================="
echo ">>> DATABASE RESTORE COMPLETED SUCCESSFULLY in ${DURATION}s <<<"
echo "Target: ${DB_NAME}"
echo "=========================================================="

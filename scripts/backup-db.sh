#!/usr/bin/env bash
# ==============================================================================
# Sanitaryware CRM — Automated Database Backup Script
# Generates compressed (.sql.gz), SHA-256 verified MySQL backups with retention pruning.
#
# Usage:
#   ./scripts/backup-db.sh
#
# Configurable Environment Variables:
#   BACKUP_DIR        Target backup directory (default: ./backups)
#   RETENTION_DAYS    Number of days to keep backups (default: 14)
#   DB_HOST           MySQL host (default: 127.0.0.1)
#   DB_PORT           MySQL port (default: 3306)
#   DB_NAME           Target database name (default: sanitaryware_crm)
#   DB_USER           MySQL username (default: crm_user)
#   DB_PASS           MySQL password (default: empty or from MYSQL_PASSWORD)
#   MYSQL_CONTAINER   Docker container name if using container exec (default: sanitarywarecrm-mysql-1)
#   BACKUP_MODE       'docker' (exec inside container) or 'host' (direct mysqldump) (default: auto-detect)
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-${MYSQL_DATABASE:-sanitaryware_crm}}"
DB_USER="${DB_USER:-${MYSQL_USER:-crm_user}}"
DB_PASS="${DB_PASS:-${MYSQL_PASSWORD:-}}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-sanitarywarecrm-mysql-1}"

mkdir -p "${BACKUP_DIR}"

# Auto-detect backup mode if not explicitly set
if [ -z "${BACKUP_MODE:-}" ]; then
  if command -v docker > /dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
    BACKUP_MODE="docker"
  else
    BACKUP_MODE="host"
  fi
fi

TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
BASE_NAME="${DB_NAME}_${TIMESTAMP}"
RAW_SQL="${BACKUP_DIR}/${BASE_NAME}.sql"
GZ_FILE="${BACKUP_DIR}/${BASE_NAME}.sql.gz"
SHA_FILE="${BACKUP_DIR}/${BASE_NAME}.sql.gz.sha256"

echo "=========================================================="
echo "Sanitaryware CRM: Production Database Backup"
echo "Database:  ${DB_NAME}"
echo "Mode:      ${BACKUP_MODE}"
echo "Target:    ${GZ_FILE}"
echo "Retention: ${RETENTION_DAYS} days"
echo "=========================================================="

START_TIME=$(date +%s)

echo "Capturing point-in-time mysqldump with --single-transaction..."
if [ "${BACKUP_MODE}" = "docker" ]; then
  docker exec -i "${MYSQL_CONTAINER}" mysqldump \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    -u "${DB_USER}" \
    -p"${DB_PASS}" \
    "${DB_NAME}" > "${RAW_SQL}"
else
  mysqldump \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -p"${DB_PASS}" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    "${DB_NAME}" > "${RAW_SQL}"
fi

if [ ! -s "${RAW_SQL}" ]; then
  echo "ERROR: mysqldump produced an empty file. Verify database credentials and connection." >&2
  rm -f "${RAW_SQL}"
  exit 1
fi

echo "Compressing backup snapshot with gzip..."
gzip -c "${RAW_SQL}" > "${GZ_FILE}"
rm -f "${RAW_SQL}"

echo "Generating SHA-256 cryptographic verification checksum..."
if command -v sha256sum > /dev/null 2>&1; then
  (cd "${BACKUP_DIR}" && sha256sum "$(basename "${GZ_FILE}")" > "$(basename "${SHA_FILE}")")
elif command -v shasum > /dev/null 2>&1; then
  (cd "${BACKUP_DIR}" && shasum -a 256 "$(basename "${GZ_FILE}")" > "$(basename "${SHA_FILE}")")
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
FILE_SIZE=$(du -h "${GZ_FILE}" | cut -f1)

echo ">>> BACKUP COMPLETED in ${DURATION}s (${FILE_SIZE}) <<<"
echo "Archive:  ${GZ_FILE}"
echo "Checksum: ${SHA_FILE}"

# Prune older backups exceeding retention days
echo ""
echo "Enforcing retention policy: deleting backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz*" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} +
echo "Retention pruning completed successfully."

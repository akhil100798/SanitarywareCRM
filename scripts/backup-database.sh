#!/usr/bin/env bash
# ==============================================================================
# Sanitaryware CRM — Automated Database Backup Runner (Linux / Bash)
# Generates point-in-time, GZipped, SHA-256 verified database snapshots.
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

MODE="${1:-docker}"
CONTAINER_NAME="${2:-sanitarywarecrm-mysql-1}"
DB_USER="${3:-crm_user}"
DB_PASS="${4:-staging_crm_password_123}"
DB_NAME="${5:-sanitaryware_crm_staging}"

mkdir -p "${BACKUP_DIR}"

TIMESTAMP="$(date +'%Y%m%d-%H%M%S')"
BASE_NAME="${DB_NAME}_backup_${TIMESTAMP}"
RAW_SQL="${BACKUP_DIR}/${BASE_NAME}.sql"
GZ_FILE="${BACKUP_DIR}/${BASE_NAME}.sql.gz"
SHA_FILE="${BACKUP_DIR}/${BASE_NAME}.sql.gz.sha256"

echo "=========================================================="
echo "Sanitaryware CRM: Automated Database Backup Runner"
echo "Database: ${DB_NAME} | Mode: ${MODE} | User: ${DB_USER}"
echo "Target Directory: ${BACKUP_DIR}"
echo "=========================================================="

START_TIME=$(date +%s)

echo "Capturing mysqldump with --single-transaction..."
if [ "${MODE}" = "docker" ]; then
    docker exec -i "${CONTAINER_NAME}" mysqldump --single-transaction --quick --routines --triggers -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" > "${RAW_SQL}"
else
    mysqldump -h 127.0.0.1 -P 3306 -u "${DB_USER}" -p"${DB_PASS}" --single-transaction --quick --routines --triggers "${DB_NAME}" > "${RAW_SQL}"
fi

if [ ! -s "${RAW_SQL}" ]; then
    echo "ERROR: mysqldump produced an empty output file." >&2
    rm -f "${RAW_SQL}"
    exit 1
fi

echo "Compressing archive with gzip..."
gzip -c "${RAW_SQL}" > "${GZ_FILE}"
rm -f "${RAW_SQL}"

echo "Generating SHA-256 integrity checksum..."
if command -v sha256sum > /dev/null 2>&1; then
    (cd "${BACKUP_DIR}" && sha256sum "$(basename "${GZ_FILE}")" > "$(basename "${SHA_FILE}")")
elif command -v shasum > /dev/null 2>&1; then
    (cd "${BACKUP_DIR}" && shasum -a 256 "$(basename "${GZ_FILE}")" > "$(basename "${SHA_FILE}")")
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

FILE_SIZE=$(du -h "${GZ_FILE}" | cut -f1)

echo ""
echo ">>> BACKUP COMPLETED SUCCESSFULLY in ${DURATION}s <<<"
echo "Archive File: ${GZ_FILE} (${FILE_SIZE})"
echo "Checksum File: ${SHA_FILE}"

echo ""
echo "Enforcing retention policy (${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "${DB_NAME}_backup_*.sql.gz*" -type f -mtime +"${RETENTION_DAYS}" -delete
echo "Retention check complete."

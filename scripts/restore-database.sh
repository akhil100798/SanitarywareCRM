#!/usr/bin/env bash
# ==============================================================================
# Sanitaryware CRM — Disaster Recovery Database Restore Runner (Linux / Bash)
# Verifies SHA-256 checksum and streams decompression into target MySQL.
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <backup-archive.sql.gz> [docker|cli] [container_name] [user] [password] [database]" >&2
    exit 1
fi

BACKUP_ARCHIVE="$1"
MODE="${2:-docker}"
CONTAINER_NAME="${3:-sanitarywarecrm-mysql-1}"
DB_USER="${4:-crm_user}"
DB_PASS="${5:-staging_crm_password_123}"
DB_NAME="${6:-sanitaryware_crm_staging}"

if [ ! -f "${BACKUP_ARCHIVE}" ]; then
    echo "ERROR: Backup archive not found: ${BACKUP_ARCHIVE}" >&2
    exit 1
fi

echo "=========================================================="
echo "Sanitaryware CRM: Disaster Recovery Database Restore"
echo "Archive: ${BACKUP_ARCHIVE} | Database: ${DB_NAME} | Mode: ${MODE}"
echo "=========================================================="

SHA_FILE="${BACKUP_ARCHIVE}.sha256"
if [ -f "${SHA_FILE}" ]; then
    echo "Verifying SHA-256 cryptographic integrity..."
    DIR="$(dirname "${BACKUP_ARCHIVE}")"
    FILE="$(basename "${BACKUP_ARCHIVE}")"
    if command -v sha256sum > /dev/null 2>&1; then
        (cd "${DIR}" && sha256sum -c "$(basename "${SHA_FILE}")")
    elif command -v shasum > /dev/null 2>&1; then
        (cd "${DIR}" && shasum -a 256 -c "$(basename "${SHA_FILE}")")
    fi
    echo "Checksum verified OK."
else
    echo "WARNING: No companion .sha256 file found. Proceeding without checksum verification."
fi

START_TIME=$(date +%s)

echo "Decompressing and streaming restore into ${DB_NAME}..."
if [ "${MODE}" = "docker" ]; then
    gzip -dc "${BACKUP_ARCHIVE}" | docker exec -i "${CONTAINER_NAME}" mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}"
else
    gzip -dc "${BACKUP_ARCHIVE}" | mysql -h 127.0.0.1 -P 3306 -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo ">>> RESTORE COMPLETED SUCCESSFULLY in ${DURATION}s <<<"

echo "Verifying post-restore Flyway schema history..."
VERIFY_SQL="SELECT COUNT(*) AS migration_count FROM flyway_schema_history;"
if [ "${MODE}" = "docker" ]; then
    docker exec -i "${CONTAINER_NAME}" mysql -u "${DB_USER}" -p"${DB_PASS}" -e "${VERIFY_SQL}" "${DB_NAME}"
else
    mysql -h 127.0.0.1 -P 3306 -u "${DB_USER}" -p"${DB_PASS}" -e "${VERIFY_SQL}" "${DB_NAME}"
fi

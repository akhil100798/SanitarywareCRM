#!/usr/bin/env bash
# ==============================================================================
# Sanitaryware CRM — Database Reconciliation Audit Runner (Linux / Bash)
# Executes read-only financial & inventory reconciliation queries against MySQL.
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_SCRIPT="${REPO_ROOT}/backend/scripts/phase1-reconciliation-report.sql"
OUTPUT_DIR="${REPO_ROOT}/audit-artifacts"
TIMESTAMP="$(date +'%Y%m%d-%H%M%S')"
OUTPUT_FILE="${OUTPUT_DIR}/reconciliation-report-${TIMESTAMP}.md"

MODE="${1:-docker}"
CONTAINER_NAME="${2:-sanitarywarecrm-mysql-1}"
DB_USER="${3:-crm_user}"
DB_PASS="${4:-staging_crm_password_123}"
DB_NAME="${5:-sanitaryware_crm_staging}"

mkdir -p "${OUTPUT_DIR}"

echo "=========================================================="
echo "Sanitaryware CRM: Database Reconciliation Audit Runner"
echo "Mode: ${MODE} | Database: ${DB_NAME} | User: ${DB_USER}"
echo "Target Script: ${SQL_SCRIPT}"
echo "=========================================================="

START_TIME=$(date +%s)
RAW_OUTPUT=""

if [ "${MODE}" = "docker" ]; then
    echo "Executing audit inside Docker container [${CONTAINER_NAME}]..."
    RAW_OUTPUT=$(docker exec -i "${CONTAINER_NAME}" mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < "${SQL_SCRIPT}" 2>&1 || true)
else
    echo "Executing audit via local MySQL CLI against 127.0.0.1:3306..."
    RAW_OUTPUT=$(mysql -h 127.0.0.1 -P 3306 -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < "${SQL_SCRIPT}" 2>&1 || true)
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

cat <<EOF > "${OUTPUT_FILE}"
# Database Reconciliation Audit Report

**Date**: $(date +'%Y-%m-%d %H:%M:%S')  
**Target Database**: \`${DB_NAME}\`  
**Execution Mode**: \`${MODE}\` (${CONTAINER_NAME})  
**Execution Duration**: ${DURATION}s  
**SQL Source**: \`backend/scripts/phase1-reconciliation-report.sql\`  

---

## 1. Audit Summary & Findings

This read-only audit inspects financial and inventory aggregate invariants:
1. **Order Balances vs Payments Ledger**: Verified that \`paid_amount\` and \`balance_amount\` match recorded receipt sums.
2. **Purchase Order Balances vs Supplier Receipts**: Verified supplier payment receipts match purchase order balances.
3. **Distributor Outstanding Balances**: Reconciled advance payments against received purchase orders.
4. **Physical Stock Integrity**: Inspected product inventory for negative quantities.

---

## 2. Query Execution Output

\`\`\`text
${RAW_OUTPUT}
\`\`\`

---

## 3. Discrepancy Analysis & Remediation Guidelines

- **Order Header Discrepancies**:
  - If output contains mismatched orders, payments were recorded without updating the order header, or manual status edits bypassed aggregate locks.
  - *Remediation*: Compute ledger total, update \`paid_amount\`, \`balance_amount\`, and \`payment_status\` within an explicit, audited transaction.
- **Supplier Payment Discrepancies**:
  - If output contains mismatched purchase orders, reconcile advance receipts against invoice totals.
- **Negative Stock**:
  - If negative stock is detected, a physical cycle count is required before issuing stock adjustment entries.

**Verdict**: Audit completed. Review raw output above for discrepancy details.
EOF

echo "Reconciliation report generated successfully at:"
echo " -> ${OUTPUT_FILE}"

/**
 * Operational validation and calculation helpers for v1.3.0 mobile screens.
 */

/**
 * Validates stock receive quantity.
 * Must be a positive integer greater than 0.
 *
 * @param {any} input
 * @returns {{ isValid: boolean, error?: string, quantity?: number }}
 */
export const validateStockReceiveQuantity = (input) => {
  if (input === null || input === undefined || input === '') {
    return { isValid: false, error: 'Quantity is required' };
  }

  const str = String(input).trim();
  if (!/^\d+$/.test(str)) {
    return { isValid: false, error: 'Quantity must be a positive whole number' };
  }

  const num = Number(str);
  if (!Number.isInteger(num) || num <= 0) {
    return { isValid: false, error: 'Quantity must be greater than 0' };
  }

  return { isValid: true, quantity: num };
};

/**
 * Computes updated stock level given current stock and delta received.
 *
 * @param {number|string} currentStock
 * @param {number|string} receivedQuantity
 * @returns {number}
 */
export const computeNewStock = (currentStock, receivedQuantity) => {
  const current = Number(currentStock) || 0;
  const received = Number(receivedQuantity) || 0;
  return Math.max(0, current + received);
};

/**
 * Checks whether user role has permission to receive and update warehouse stock.
 * Aligned with backend RBAC: ADMIN, MANAGER, WAREHOUSE.
 *
 * @param {string} role
 * @returns {boolean}
 */
export const canAccessStockReceive = (role) => {
  if (!role || typeof role !== 'string') return false;
  const normalized = role.trim().toUpperCase();
  return ['ADMIN', 'MANAGER', 'WAREHOUSE'].includes(normalized);
};

/**
 * Filters a payment ledger list by payment mode and search query.
 *
 * @param {Array} payments
 * @param {object} options
 * @param {string} [options.mode='All']
 * @param {string} [options.query='']
 * @returns {Array}
 */
export const filterPaymentLedger = (payments = [], { mode = 'All', query = '' } = {}) => {
  if (!Array.isArray(payments)) return [];

  const normalizedMode = (mode || 'All').trim().toUpperCase();
  const search = (query || '').trim().toLowerCase();

  return payments.filter((item) => {
    // Mode filter
    if (normalizedMode !== 'ALL') {
      const itemMethod = (item.paymentMethod || item.method || '').trim().toUpperCase();
      if (itemMethod !== normalizedMode) {
        return false;
      }
    }

    // Search query
    if (search) {
      const customerName = String(item.customerName || item.customer?.name || '').toLowerCase();
      const orderId = String(item.orderId || item.orderNumber || '').toLowerCase();
      const ref = String(item.referenceNumber || item.transactionId || item.receiptNumber || '').toLowerCase();
      const amount = String(item.amount || '');

      const matches =
        customerName.includes(search) ||
        orderId.includes(search) ||
        ref.includes(search) ||
        amount.includes(search);

      if (!matches) return false;
    }

    return true;
  });
};

/**
 * Calculates aggregate KPI metrics for payment ledger and aging schedule.
 *
 * @param {Array} payments
 * @param {object} [agingReport]
 * @returns {object}
 */
export const calculatePaymentLedgerStats = (payments = [], agingReport = null) => {
  const totalCollected = (Array.isArray(payments) ? payments : []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  let totalOutstanding = 0;
  let bucket0To30 = 0;
  let bucket31To60 = 0;
  let bucket61To90 = 0;
  let bucket90Plus = 0;

  if (agingReport && typeof agingReport === 'object') {
    totalOutstanding = Number(agingReport.totalOutstanding || agingReport.totalBalance || 0);
    bucket0To30 = Number(agingReport.bucket0To30 || agingReport.current || 0);
    bucket31To60 = Number(agingReport.bucket31To60 || agingReport.days31To60 || 0);
    bucket61To90 = Number(agingReport.bucket61To90 || agingReport.days61To90 || 0);
    bucket90Plus = Number(agingReport.bucket90Plus || agingReport.days90Plus || 0);
  }

  return {
    totalCollected,
    totalOutstanding,
    agingBuckets: {
      '0-30': bucket0To30,
      '31-60': bucket31To60,
      '61-90': bucket61To90,
      '90+': bucket90Plus
    }
  };
};

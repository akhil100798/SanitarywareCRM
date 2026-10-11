import React from 'react';

const tones = {
    PAID: 'success', ACTIVE: 'success', DELIVERED: 'success', RECEIVED: 'success', ACCEPTED: 'success', IN_STOCK: 'success',
    PARTIAL: 'warning', PARTIALLY_RECEIVED: 'warning', PENDING: 'warning', LOW_STOCK: 'warning', EXPIRED: 'warning',
    UNPAID: 'danger', CANCELLED: 'danger', REJECTED: 'danger', OUT_OF_STOCK: 'danger', INACTIVE: 'danger', INACTIVE_STATUS: 'danger',
    SENT: 'info', CONFIRMED: 'info', PROCESSING: 'info', READY_TO_SHIP: 'info', SHIPPED: 'info', ORDERED: 'info', CONVERTED: 'info',
};
export function StatusBadge({ status, label, tone }) {
    const key = String(status || 'UNKNOWN').toUpperCase().replaceAll(' ', '_');
    const text = label || key.toLowerCase().replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
    return <span className={`status-badge status-${tone || tones[key] || 'neutral'}`}>{text}</span>;
}

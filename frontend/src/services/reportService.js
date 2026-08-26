import api from './api';

export const reportService = {
    getSalesSummary: (params) => api.get('/reports/sales-summary', { params }),
    getCustomerOutstanding: (params) => api.get('/reports/customer-outstanding', { params }),
    getDistributorOutstanding: (params) => api.get('/reports/distributor-outstanding', { params }),
    getPaymentSummary: (params) => api.get('/reports/payment-summary', { params }),
    getPurchaseSummary: (params) => api.get('/reports/purchase-summary', { params }),
    getInventorySummary: (params) => api.get('/reports/inventory-summary', { params }),
};

export default reportService;

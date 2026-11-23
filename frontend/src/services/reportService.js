import api from './api';

export const reportService = {
    getSalesSummary: (params) => api.get('/reports/sales-summary', { params }),
    getCustomerOutstanding: (params) => api.get('/reports/customer-outstanding', { params }),
    getDistributorOutstanding: (params) => api.get('/reports/distributor-outstanding', { params }),
    getPaymentSummary: (params) => api.get('/reports/payment-summary', { params }),
    getPurchaseSummary: (params) => api.get('/reports/purchase-summary', { params }),
    getInventorySummary: (params) => api.get('/reports/inventory-summary', { params }),

    // P3 Additions
    getGstTaxSummary: (params) => api.get('/reports/gst-summary', { params }),
    exportGstTaxSummary: (params, format = 'xlsx') => 
        api.get('/reports/gst-summary/export', { params: { ...params, format }, responseType: 'blob' }),

    getPaymentAging: (params) => api.get('/reports/payment-aging', { params }),
    exportPaymentAging: (params, format = 'xlsx') => 
        api.get('/reports/payment-aging/export', { params: { ...params, format }, responseType: 'blob' }),

    getDeadStock: (params) => api.get('/reports/dead-stock', { params }),
    getBrandMargins: (params) => api.get('/reports/brand-margins', { params }),
};

export default reportService;

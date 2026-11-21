import api from './api';

const quotationService = {
    getAll: (params) => api.get('/quotations', { params }),
    getById: (id) => api.get(`/quotations/${id}`),
    create: (data) => api.post('/quotations', data),
    update: (id, data) => api.put(`/quotations/${id}`, data),
    delete: (id) => api.delete(`/quotations/${id}`),
    updateStatus: (id, status, reason) => api.patch(`/quotations/${id}/status`, null, { params: { status, reason } }),
    getByCustomer: (customerId) => api.get(`/quotations/customer/${customerId}`),
    downloadPdf: (id) => api.get(`/quotations/${id}/pdf`, { responseType: 'blob' }),
    sendWhatsApp: (id, data) => api.post(`/quotations/${id}/send-whatsapp`, data || {}),
    getByShareToken: (token) => api.get(`/portal/quotations/${token}`),
    downloadPortalPdf: (token) => api.get(`/portal/quotations/${token}/pdf`, { responseType: 'blob' }),
    acceptPortalQuotation: (token) => api.post(`/portal/quotations/${token}/accept`),
    importBoq: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/quotations/import-boq', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    getBackToBackPreview: (id) => api.get(`/quotations/${id}/back-to-back-preview`),
    generatePurchaseOrders: (id, data) => api.post(`/quotations/${id}/generate-purchase-orders`, data),
};

export default quotationService;

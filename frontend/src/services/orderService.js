import api from './api';

const orderService = {
    getAll: (params) => api.get('/orders', { params }),
    getById: (id) => api.get(`/orders/${id}`),
    create: (data) => api.post('/orders', data),
    createFromQuotation: (quotationId) => api.post(`/orders/from-quotation/${quotationId}`),
    update: (id, data) => api.put(`/orders/${id}`, data),
    delete: (id) => api.delete(`/orders/${id}`),
    updateStatus: (id, status) => api.patch(`/orders/${id}/status`, null, { params: { status } }),
    updatePaymentStatus: (id, status) => api.patch(`/orders/${id}/payment-status`, null, { params: { status } }),
    getByCustomer: (customerId) => api.get(`/orders/customer/${customerId}`),
    downloadInvoicePdf: (id) => api.get(`/orders/${id}/invoice/pdf`, { responseType: 'blob' }),
};

export default orderService;

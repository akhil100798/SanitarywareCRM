import api from './api';

const quotationService = {
    getAll: (params) => api.get('/quotations', { params }),
    getById: (id) => api.get(`/quotations/${id}`),
    create: (data) => api.post('/quotations', data),
    update: (id, data) => api.put(`/quotations/${id}`, data),
    delete: (id) => api.delete(`/quotations/${id}`),
    updateStatus: (id, status) => api.patch(`/quotations/${id}/status`, null, { params: { status } }),
    getByCustomer: (customerId) => api.get(`/quotations/customer/${customerId}`),
};

export default quotationService;

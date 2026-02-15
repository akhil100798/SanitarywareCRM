import api from './api';

const customerService = {
    getAll: (params) => api.get('/customers', { params }),
    getById: (id) => api.get(`/customers/${id}`),
    create: (data) => api.post('/customers', data),
    update: (id, data) => api.put(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`),
    search: (query, params) => api.get('/customers/search', { params: { ...params, query } }),
    getActive: () => api.get('/customers/active'),
    getByType: (type, params) => api.get(`/customers/type/${type}`, { params }),
};

export default customerService;

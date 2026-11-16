import api from './api';

const paymentService = {
    getAll: () => api.get('/payments'),
    getById: (id) => api.get(`/payments/${id}`),
    getByOrder: (orderId) => api.get(`/payments/order/${orderId}`),
    create: (data, key) => api.post('/payments', data, key ? { headers: { 'Idempotency-Key': key } } : {}),
    delete: (id) => api.delete(`/payments/${id}`),
};

export default paymentService;

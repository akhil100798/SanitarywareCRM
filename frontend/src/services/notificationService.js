import api from './api';

export const notificationService = {
    getDispatchLogs: (params) => api.get('/notifications/logs', { params }),
    retryDispatch: (id) => api.post(`/notifications/retry/${id}`),
    triggerLowStock: () => api.post('/notifications/trigger/low-stock'),
    triggerPaymentDue: () => api.post('/notifications/trigger/payment-due'),
};

export default notificationService;

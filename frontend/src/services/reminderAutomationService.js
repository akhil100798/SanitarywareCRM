import api from './api';

const reminderAutomationService = {
    getPreview: () => api.get('/automation/reminders/preview'),
    triggerQuotationReminders: () => api.post('/automation/reminders/quotations/trigger'),
    triggerPaymentReminders: () => api.post('/automation/reminders/payments/trigger'),
    triggerAllReminders: () => api.post('/automation/reminders/trigger-all'),
    getHistory: () => api.get('/automation/reminders/history'),
};

export default reminderAutomationService;

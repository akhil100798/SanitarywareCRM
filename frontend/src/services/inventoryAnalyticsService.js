import api from './api';

const inventoryAnalyticsService = {
    getAlerts: () => api.get('/inventory-analytics/alerts'),
    getReorderSuggestions: () => api.get('/inventory-analytics/reorder-suggestions'),
    getDeadStock: () => api.get('/inventory-analytics/dead-stock'),
    getSummary: () => api.get('/inventory-analytics/summary'),
};

export default inventoryAnalyticsService;

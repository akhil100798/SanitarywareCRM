import api from './api';

const inventoryAnalyticsService = {
    getAlerts: () => api.get('/inventory-analytics/alerts'),
    getReorderSuggestions: () => api.get('/inventory-analytics/reorder-suggestions'),
    getSummary: () => api.get('/inventory-analytics/summary'),
};

export default inventoryAnalyticsService;

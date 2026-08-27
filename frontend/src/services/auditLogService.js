import api from './api';

export const auditLogService = {
  getAuditLogs: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const response = await api.get('/audit-logs', { params: cleanParams });
    return response.data;
  },
};

export default auditLogService;

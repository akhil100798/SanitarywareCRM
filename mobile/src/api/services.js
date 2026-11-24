import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from './client';
import { sessionStorage } from './storage';
import { API_BASE_URL } from './config';

export const resolveMediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const base = (API_BASE_URL || 'http://10.0.2.2:8081/api').replace(/\/api\/?$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

const unwrapPage = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (data && typeof data === 'object') return [data];
  return [];
};

const joinMeta = (...parts) => parts.filter(Boolean).join(' | ');
const money = (value) =>
  value === null || value === undefined || value === '' ? null : `INR ${value}`;

export const authService = {
  async login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    const { token, ...user } = response.data;
    await sessionStorage.setToken(token);
    await sessionStorage.setUser(user);
    return user;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      await sessionStorage.clear();
    }
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  clearSession() {
    return sessionStorage.clear();
  },

  getStoredUser() {
    return Promise.all([sessionStorage.getUser(), sessionStorage.getToken()]).then(([storedUser, accessToken]) => {
      if (!storedUser || !accessToken) {
        return sessionStorage.clear().then(() => null);
      }
      const { token, ...user } = storedUser;
      if (token) {
        // Migrate sessions created by versions that stored the bearer token twice.
        return sessionStorage.setUser(user).then(() => user);
      }
      return user;
    });
  }
};

export const dashboardService = {
  async getStats() {
    const response = await api.get('/dashboard/stats');
    return response.data;
  }
};

export const listServices = {
  customers: {
    title: 'Customers',
    endpoint: '/customers',
    searchEndpoint: '/customers/search',
    params: { size: 50, sort: 'id,desc' },
    mapItem: (item) => ({
      id: item.id,
      title: item.name,
      subtitle: item.company || item.phoneNumber || item.email || 'Customer',
      meta: joinMeta(item.city, item.customerType),
      badge: item.isActive === false ? 'Inactive' : 'Active'
    })
  },
  products: {
    title: 'Products',
    endpoint: '/products',
    searchEndpoint: '/products/search',
    params: { size: 50 },
    mapItem: (item) => {
      const rawImg = item.images?.find((img) => img.isPrimary)?.imageUrl ||
        item.images?.[0]?.imageUrl ||
        item.imageUrls?.[0] ||
        item.imageUrl;
      return {
        id: item.id,
        title: item.name,
        subtitle: joinMeta(item.sku || 'No SKU', item.brandName, item.size && item.size !== '--' && item.size),
        meta: `Stock ${item.stockQuantity ?? 0} ${item.unit || ''}`,
        amount: money(item.sellingPrice),
        badge: item.stockQuantity <= item.reorderLevel ? 'Low stock' : (item.isAvailable === false ? 'Unavailable' : 'In stock'),
        imageUrl: resolveMediaUrl(rawImg),
        raw: item
      };
    }
  },
  orders: {
    title: 'Orders',
    endpoint: '/orders',
    params: { size: 50, sort: 'id,desc' },
    mapItem: (item) => ({
      id: item.id,
      title: item.orderNumber || `Order #${item.id}`,
      subtitle: item.customerName || 'Customer',
      meta: joinMeta(item.orderDate, item.status, item.paymentStatus),
      amount: money(item.total),
      badge: item.status
    })
  },
  quotations: {
    title: 'Quotations',
    endpoint: '/quotations',
    params: { size: 50, sort: 'id,desc' },
    mapItem: (item) => ({
      id: item.id,
      title: item.quotationNumber || `Quotation #${item.id}`,
      subtitle: item.customerName || 'Customer',
      meta: joinMeta(item.quotationDate, item.validUntil && `Valid ${item.validUntil}`),
      amount: money(item.total),
      badge: item.status
    })
  },
  payments: {
    title: 'Payments',
    endpoint: '/payments',
    mapItem: (item) => ({
      id: item.id,
      title: item.paymentNumber || `Payment #${item.id}`,
      subtitle: item.orderNumber || 'Order payment',
      meta: joinMeta(item.paymentDate, item.paymentMethod),
      amount: money(item.amount),
      badge: item.receivedByName
    })
  },
  distributors: {
    title: 'Distributors',
    endpoint: '/distributors',
    params: { size: 50 },
    mapItem: (item) => ({
      id: item.id,
      title: item.name,
      subtitle: item.contactPerson || item.phoneNumber || item.email || 'Distributor',
      meta: joinMeta(item.city, item.state),
      amount: money(item.outstandingBalance),
      badge: item.isActive === false ? 'Inactive' : 'Active'
    })
  },
  purchaseOrders: {
    title: 'Purchase Orders',
    endpoint: '/purchase-orders',
    params: { size: 50 },
    mapItem: (item) => ({
      id: item.id,
      title: item.poNumber || `PO #${item.id}`,
      subtitle: item.distributorName || 'Distributor',
      meta: joinMeta(item.orderDate, item.status),
      amount: money(item.total),
      badge: item.balanceAmount ? `Balance ${item.balanceAmount}` : item.status
    })
  },
  distributorPayments: {
    title: 'Distributor Payments',
    endpoint: '/distributor-payments',
    params: { size: 50 },
    mapItem: (item) => ({
      id: item.id,
      title: item.paymentNumber || `Distributor payment #${item.id}`,
      subtitle: item.distributorName || item.poNumber || 'Distributor payment',
      meta: joinMeta(item.paymentDate, item.paymentMethod),
      amount: money(item.amount),
      badge: item.paidByName
    })
  },
  brands: {
    title: 'Brands',
    endpoint: '/brands',
    params: { size: 50 },
    mapItem: (item) => ({
      id: item.id,
      title: item.name,
      subtitle: item.description || 'Brand',
      meta: item.createdAt,
      badge: item.isActive === false ? 'Inactive' : 'Active'
    })
  },
  categories: {
    title: 'Categories',
    endpoint: '/categories',
    params: { size: 50 },
    mapItem: (item) => ({
      id: item.id,
      title: item.name,
      subtitle: item.parentName ? `Under ${item.parentName}` : 'Root category',
      meta: item.description,
      badge: item.isActive === false ? 'Inactive' : 'Active'
    })
  },
  settings: {
    title: 'Settings',
    endpoint: '/settings',
    mapItem: (item) => ({
      id: item.id || 'settings',
      title: item.companyName || 'Company settings',
      subtitle: joinMeta(item.phone, item.email),
      meta: joinMeta(item.city, item.state, item.gstNumber),
      badge: item.currencySymbol || 'Settings'
    })
  }
};

export const fetchList = async (resource, query) => {
  const config = listServices[resource];
  const isSearch = query?.trim() && config.searchEndpoint;
  const response = await api.get(isSearch ? config.searchEndpoint : config.endpoint, {
    params: isSearch ? { ...config.params, query: query.trim() } : config.params
  });
  let items = unwrapPage(response.data);
  if (resource === 'brands') {
    items = [...items].sort((a, b) => (b.id || 0) - (a.id || 0));
  }
  return items.map(config.mapItem);
};
export const customerService = {
  async getById(customerId) {
    const response = await api.get(`/customers/${customerId}`);
    return response.data;
  },

  async create(payload) {
    const response = await api.post('/customers', payload);
    return response.data;
  },

  async update(customerId, payload) {
    const response = await api.put(`/customers/${customerId}`, payload);
    return response.data;
  },

  async getActive() {
    const response = await api.get('/customers/active');
    return unwrapPage(response.data);
  },

  async getQuotations(customerId) {
    const response = await api.get(`/quotations/customer/${customerId}`);
    return unwrapPage(response.data);
  },

  async getOrders(customerId) {
    const response = await api.get(`/orders/customer/${customerId}`);
    return unwrapPage(response.data);
  }
};

export const productService = {
  async getProducts(params = { size: 50 }) {
    const response = await api.get('/products', { params });
    return unwrapPage(response.data);
  },

  async getAll(params = {}) {
    const response = await api.get('/products', { params });
    return unwrapPage(response.data);
  },

  async getLowStock() {
    const response = await api.get('/products/low-stock');
    return unwrapPage(response.data);
  },

  async search(query, params = {}) {
    const response = await api.get('/products/search', { params: { ...params, query } });
    return unwrapPage(response.data);
  },

  async searchProducts(query, params = { size: 50 }) {
    const trimmed = query?.trim();
    if (!trimmed) {
      return this.getProducts(params);
    }
    const response = await api.get('/products/search', { params: { ...params, query: trimmed } });
    return unwrapPage(response.data);
  },

  async getById(productId) {
    const response = await api.get(`/products/${productId}`);
    return response.data;
  },

  async getVariantsByModel(brandId, query) {
    if (!brandId) return [];
    const response = await api.get('/products', {
      params: { brandId, query: query?.trim(), size: 30 }
    });
    return unwrapPage(response.data);
  },

  async updateStock(productId, quantity, reason = 'PO_RECEIVING', rmaCode = null) {
    const response = await api.patch(`/products/${productId}/stock`, null, {
      params: { quantity, reason, ...(rmaCode ? { rmaCode } : {}) }
    });
    return response.data;
  }
};

export const brandService = {
  async getAll() {
    const response = await api.get('/brands');
    return response.data;
  },

  async getById(brandId) {
    const response = await api.get(`/brands/${brandId}`);
    return response.data;
  },

  async create(payload) {
    const response = await api.post('/brands', payload);
    return response.data;
  },

  async attachCatalog(brandId, fileOrFormData) {
    const response = await api.post(`/brands/${brandId}/catalog`, fileOrFormData);
    return response.data;
  },

  async getCatalogVersions(brandId) {
    const response = await api.get(`/brands/${brandId}/catalog-versions`);
    return response.data;
  }
};

export const quotationService = {
  async getById(quotationId) {
    const response = await api.get(`/quotations/${quotationId}`);
    return response.data;
  },

  async create(payload) {
    const response = await api.post('/quotations', payload);
    return response.data;
  },

  async sendWhatsApp(quotationId, phoneNumber) {
    const response = await api.post(`/quotations/${quotationId}/send-whatsapp`, phoneNumber ? { phoneNumber } : {});
    return response.data;
  },

  async importContractorNote(asset) {
    const formData = new FormData();
    if (Platform.OS === 'web') {
      if (asset instanceof Blob || (typeof File !== 'undefined' && asset instanceof File)) {
        formData.append('file', asset, asset.name || 'contractor_note.jpg');
      } else if (asset.file) {
        formData.append('file', asset.file, asset.fileName || asset.file.name || 'contractor_note.jpg');
      } else if (typeof asset.uri === 'string' && (asset.uri.startsWith('blob:') || asset.uri.startsWith('data:'))) {
        const res = await fetch(asset.uri);
        const blob = await res.blob();
        formData.append('file', blob, asset.fileName || 'contractor_note.jpg');
      } else {
        formData.append('file', asset);
      }
    } else {
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'contractor_note.jpg',
        type: asset.mimeType || 'image/jpeg'
      });
    }

    const response = await api.post('/quotations/import-boq', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export const orderService = {
  async getById(orderId) {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  async create(payload) {
    const response = await api.post('/orders', payload);
    return response.data;
  },

  async update(orderId, payload) {
    const response = await api.put(`/orders/${orderId}`, payload);
    return response.data;
  },

  async getAll(params = { size: 50, sort: 'id,desc' }) {
    const response = await api.get('/orders', { params });
    return unwrapPage(response.data);
  },

  async createFromQuotation(quotationId) {
    const response = await api.post(`/orders/from-quotation/${quotationId}`);
    return response.data;
  },

  async downloadInvoice(orderId) {
    if (Platform.OS === 'web') {
      const response = await api.get(`/orders/${orderId}/invoice/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      return { uri: `invoice-${orderId}.pdf`, fileName: `invoice-${orderId}.pdf` };
    }

    const token = await sessionStorage.getToken();
    const fileName = `invoice-${orderId}.pdf`;
    const targetUri = `${FileSystem.documentDirectory}${fileName}`;

    const downloadResult = await FileSystem.downloadAsync(
      `${API_BASE_URL}/orders/${orderId}/invoice/pdf`,
      targetUri,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );

    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download invoice PDF: HTTP ${downloadResult.status}`);
    }

    // Copy to external app storage for instant non-root accessibility
    const externalUri = `file:///sdcard/Android/data/com.sanitarywarecrm/files/${fileName}`;
    try {
      await FileSystem.copyAsync({
        from: downloadResult.uri,
        to: externalUri
      });
    } catch {
      // Ignored if external storage is inaccessible
    }

    // Also attempt copy to public /sdcard/Download/
    try {
      await FileSystem.copyAsync({
        from: downloadResult.uri,
        to: `file:///sdcard/Download/${fileName}`
      });
    } catch {
      // Ignored if /sdcard/Download is inaccessible
    }

    return {
      uri: downloadResult.uri,
      externalUri,
      fileName,
      status: downloadResult.status
    };
  }
};

export const paymentService = {
  async getAll(params = {}) {
    const response = await api.get('/payments', { params });
    return unwrapPage(response.data);
  },

  async getByOrder(orderId) {
    const response = await api.get(`/payments/order/${orderId}`);
    return unwrapPage(response.data);
  },

  async create(payload, key) {
    const response = await api.post('/payments', payload, key ? { headers: { 'Idempotency-Key': key } } : {});
    return response.data;
  },

  async sendWhatsApp(paymentId, phoneNumber) {
    const response = await api.post(`/payments/${paymentId}/send-whatsapp`, phoneNumber ? { phoneNumber } : {});
    return response.data;
  }
};

export const inventoryAnalyticsService = {
  async getSummary() {
    const response = await api.get('/inventory-analytics/summary');
    return response.data;
  },

  async getAlerts() {
    const response = await api.get('/inventory-analytics/alerts');
    return unwrapPage(response.data);
  },

  async getReorderSuggestions() {
    const response = await api.get('/inventory-analytics/reorder-suggestions');
    return unwrapPage(response.data);
  }
};

export const notificationService = {
  async getDispatchLogs(params = {}) {
    const response = await api.get('/notifications/logs', { params });
    return response.data;
  },

  async retryDispatch(id) {
    const response = await api.post(`/notifications/retry/${id}`);
    return response.data;
  },

  async triggerLowStock() {
    const response = await api.post('/notifications/trigger/low-stock');
    return response.data;
  },

  async triggerPaymentDue() {
    const response = await api.post('/notifications/trigger/payment-due');
    return response.data;
  }
};

export const reportService = {
  async getGstTaxSummary(params = {}) {
    const response = await api.get('/reports/gst-summary', { params });
    return response.data;
  },

  async getPaymentAging(params = {}) {
    const response = await api.get('/reports/payment-aging', { params });
    return response.data;
  },

  async getDeadStock(params = {}) {
    const response = await api.get('/reports/dead-stock', { params });
    return response.data;
  },

  async getBrandMargins(params = {}) {
    const response = await api.get('/reports/brand-margins', { params });
    return response.data;
  }
};

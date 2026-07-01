import { api } from './client';
import { sessionStorage } from './storage';

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
    const user = response.data;
    await sessionStorage.setToken(user.token);
    await sessionStorage.setUser(user);
    return user;
  },

  async logout() {
    await sessionStorage.clear();
  },

  getStoredUser() {
    return sessionStorage.getUser();
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
    params: { size: 50 },
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
    mapItem: (item) => ({
      id: item.id,
      title: item.name,
      subtitle: joinMeta(item.sku || 'No SKU', item.brandName),
      meta: `Stock ${item.stockQuantity ?? 0} ${item.unit || ''}`,
      amount: money(item.sellingPrice),
      badge: item.stockQuantity <= item.reorderLevel ? 'Low stock' : 'In stock'
    })
  },
  orders: {
    title: 'Orders',
    endpoint: '/orders',
    params: { size: 50 },
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
    params: { size: 50 },
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
  return unwrapPage(response.data).map(config.mapItem);
};
export const customerService = {
  async getById(customerId) {
    const response = await api.get(`/customers/${customerId}`);
    return response.data;
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

  async searchProducts(query, params = { size: 50 }) {
    const trimmed = query?.trim();
    if (!trimmed) {
      return this.getProducts(params);
    }
    const response = await api.get('/products/search', { params: { ...params, query: trimmed } });
    return unwrapPage(response.data);
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
  }
};

export const orderService = {
  async getById(orderId) {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  async createFromQuotation(quotationId) {
    const response = await api.post(`/orders/from-quotation/${quotationId}`);
    return response.data;
  }
};

export const paymentService = {
  async getByOrder(orderId) {
    const response = await api.get(`/payments/order/${orderId}`);
    return unwrapPage(response.data);
  },

  async create(payload) {
    const response = await api.post('/payments', payload);
    return response.data;
  }
};
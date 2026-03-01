import api from './api';

const purchaseOrderService = {
    // Get all purchase orders
    getAllPurchaseOrders: async (page = 0, size = 10) => {
        const response = await api.get(`/purchase-orders?page=${page}&size=${size}`);
        return response.data;
    },

    // Get a single purchase order by ID
    getPurchaseOrderById: async (id) => {
        const response = await api.get(`/purchase-orders/${id}`);
        return response.data;
    },

    // Get purchase orders for a specific distributor
    getPurchaseOrdersByDistributor: async (distributorId) => {
        const response = await api.get(`/purchase-orders/distributor/${distributorId}`);
        return response.data;
    },

    // Create a new purchase order
    createPurchaseOrder: async (orderData) => {
        const response = await api.post('/purchase-orders', orderData);
        return response.data;
    },

    // Update an existing purchase order
    updatePurchaseOrder: async (id, orderData) => {
        const response = await api.put(`/purchase-orders/${id}`, orderData);
        return response.data;
    },

    // Update purchase order status
    updateStatus: async (id, status) => {
        const response = await api.patch(`/purchase-orders/${id}/status?status=${status}`);
        return response.data;
    },

    // Delete a purchase order
    deletePurchaseOrder: async (id) => {
        const response = await api.delete(`/purchase-orders/${id}`);
        return response.data;
    }
};

export default purchaseOrderService;

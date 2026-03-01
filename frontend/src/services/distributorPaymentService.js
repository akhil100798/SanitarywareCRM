import api from './api';

const distributorPaymentService = {
    // Get all payments
    getAllPayments: async (page = 0, size = 10) => {
        const response = await api.get(`/distributor-payments?page=${page}&size=${size}`);
        return response.data;
    },

    // Get a single payment
    getPaymentById: async (id) => {
        const response = await api.get(`/distributor-payments/${id}`);
        return response.data;
    },

    // Get payments for a specific purchase order
    getPaymentsByPurchaseOrder: async (poId) => {
        const response = await api.get(`/distributor-payments/purchase-order/${poId}`);
        return response.data;
    },

    // Create a new payment
    createPayment: async (paymentData) => {
        const response = await api.post('/distributor-payments', paymentData);
        return response.data;
    },

    // Delete a payment
    deletePayment: async (id) => {
        const response = await api.delete(`/distributor-payments/${id}`);
        return response.data;
    }
};

export default distributorPaymentService;

import api from './api';

const distributorService = {
    // Get all distributors (paginated with optional search)
    getAllDistributors: async (page = 0, size = 10, search = '') => {
        let url = `/distributors?page=${page}&size=${size}`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }
        const response = await api.get(url);
        return response.data;
    },

    // Get all active distributors (for dropdowns)
    getAllActiveDistributors: async () => {
        const response = await api.get('/distributors/active');
        return response.data;
    },

    // Get a single distributor by ID
    getDistributorById: async (id) => {
        const response = await api.get(`/distributors/${id}`);
        return response.data;
    },

    // Create a new distributor
    createDistributor: async (distributorData) => {
        const response = await api.post('/distributors', distributorData);
        return response.data;
    },

    // Update an existing distributor
    updateDistributor: async (id, distributorData) => {
        const response = await api.put(`/distributors/${id}`, distributorData);
        return response.data;
    },

    // Delete a distributor
    deleteDistributor: async (id) => {
        const response = await api.delete(`/distributors/${id}`);
        return response.data;
    },

    // Toggle active status
    toggleActiveStatus: async (id) => {
        const response = await api.patch(`/distributors/${id}/toggle-status`);
        return response.data;
    }
};

export default distributorService;

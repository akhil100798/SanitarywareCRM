import api from './api';

export const authService = {
    login: async (username, password) => {
        const response = await api.post('/auth/login', { username, password });
        if (response.data.token) {
            sessionStorage.setItem('token', response.data.token);
            sessionStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
    },

    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    logout: () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
    },

    getCurrentUser: () => {
        const userStr = sessionStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: () => {
        return !!sessionStorage.getItem('token');
    },

    updateProfile: async (data) => {
        const response = await api.put('/auth/profile', data);
        if (response.data) {
            // Update stored user data without overwriting token
            const currentUser = JSON.parse(sessionStorage.getItem('user'));
            const updatedUser = { ...currentUser, ...response.data };
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
        return response;
    },
};

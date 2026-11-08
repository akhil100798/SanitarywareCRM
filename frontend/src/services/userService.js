import api from './api';

export const userService = {
    list: async () => (await api.get('/users')).data,
    create: async (user) => (await api.post('/users', user)).data,
    updateAccess: async (id, access) => (await api.patch(`/users/${id}/access`, access)).data,
};

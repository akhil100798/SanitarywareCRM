import api from './api';

const authChannel = typeof BroadcastChannel === 'undefined'
    ? null
    : new BroadcastChannel('sanitaryware-crm-auth');

const clearSession = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
};

const withoutToken = (user) => {
    if (!user || typeof user !== 'object') return user;
    const { token, ...safeUser } = user;
    return safeUser;
};

export const authService = {
    login: async (username, password) => {
        const response = await api.post('/auth/login', { username, password });
        if (response.data.token) {
            sessionStorage.setItem('token', response.data.token);
            sessionStorage.setItem('user', JSON.stringify(withoutToken(response.data)));
        }
        return withoutToken(response.data);
    },

    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            // Silently ignore server error so client logout always succeeds
        } finally {
            clearSession();
            authChannel?.postMessage({ type: 'LOGOUT' });
        }
    },

    getCurrentUser: () => {
        const userStr = sessionStorage.getItem('user');
        if (!userStr) return null;

        const user = JSON.parse(userStr);
        const safeUser = withoutToken(user);
        // Migrate sessions created by versions that stored the bearer token twice.
        if (user?.token) {
            sessionStorage.setItem('user', JSON.stringify(safeUser));
        }
        return safeUser;
    },

    isAuthenticated: () => {
        return !!sessionStorage.getItem('token');
    },

    onLogout: (callback) => {
        if (!authChannel) return () => {};
        const listener = (event) => {
            if (event.data?.type === 'LOGOUT') {
                clearSession();
                callback();
            }
        };
        authChannel.addEventListener('message', listener);
        return () => authChannel.removeEventListener('message', listener);
    },

    updateProfile: async (data) => {
        const response = await api.put('/auth/profile', data);
        if (response.data) {
            // Update stored user data without overwriting token
            const currentUser = JSON.parse(sessionStorage.getItem('user'));
            const updatedUser = withoutToken({ ...currentUser, ...response.data });
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
        return response;
    },
};

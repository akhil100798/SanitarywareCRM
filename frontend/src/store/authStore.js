import { create } from 'zustand';
import { authService } from '../services/authService';

export const useAuthStore = create((set) => ({
    user: authService.getCurrentUser(),
    isAuthenticated: authService.isAuthenticated(),

    login: async (username, password) => {
        const data = await authService.login(username, password);
        set({ user: data, isAuthenticated: true });
        return data;
    },

    logout: () => {
        authService.logout();
        set({ user: null, isAuthenticated: false });
    },

    setUser: (user) => set({ user, isAuthenticated: !!user }),
}));

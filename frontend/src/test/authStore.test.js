import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../services/authService', () => {
    let currentUser = null;
    let authenticated = false;
    let logoutCallback = null;

    return {
        authService: {
            getCurrentUser: vi.fn(() => currentUser),
            isAuthenticated: vi.fn(() => authenticated),
            login: vi.fn(async (username, _password) => {
                const user = { id: 1, username, role: 'ADMIN' };
                currentUser = user;
                authenticated = true;
                return user;
            }),
            logout: vi.fn(async () => {
                currentUser = null;
                authenticated = false;
            }),
            onLogout: vi.fn((cb) => {
                logoutCallback = cb;
                return () => {};
            }),
            _triggerLogoutCallback: () => logoutCallback && logoutCallback(),
        },
    };
});

import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';

describe('useAuthStore', () => {
    beforeEach(() => {
        useAuthStore.setState({ user: null, isAuthenticated: false });
        vi.clearAllMocks();
    });

    it('initializes with default unauthenticated state', () => {
        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
    });

    it('logs in successfully and updates state', async () => {
        const user = await useAuthStore.getState().login('admin', 'password123');

        expect(authService.login).toHaveBeenCalledWith('admin', 'password123');
        expect(user).toEqual({ id: 1, username: 'admin', role: 'ADMIN' });
        expect(useAuthStore.getState().user).toEqual({ id: 1, username: 'admin', role: 'ADMIN' });
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('logs out successfully and resets state', async () => {
        useAuthStore.setState({ user: { id: 1, username: 'admin' }, isAuthenticated: true });

        await useAuthStore.getState().logout();

        expect(authService.logout).toHaveBeenCalled();
        expect(useAuthStore.getState().user).toBeNull();
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('allows manually setting user', () => {
        useAuthStore.getState().setUser({ id: 2, username: 'sales', role: 'SALES' });
        expect(useAuthStore.getState().user).toEqual({ id: 2, username: 'sales', role: 'SALES' });
        expect(useAuthStore.getState().isAuthenticated).toBe(true);

        useAuthStore.getState().setUser(null);
        expect(useAuthStore.getState().user).toBeNull();
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
});

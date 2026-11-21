import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import api from '../services/api';

describe('api service interceptors', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        sessionStorage.clear();
        delete window.location;
        window.location = { href: 'http://localhost/' };
    });

    afterEach(() => {
        window.location = originalLocation;
    });

    it('attaches Bearer token to request header when token exists in sessionStorage', async () => {
        sessionStorage.setItem('token', 'sample-jwt-token');

        // Extract the request interceptor handler
        const requestInterceptor = api.interceptors.request.handlers[0].fulfilled;
        const config = { headers: {} };
        const result = await requestInterceptor(config);

        expect(result.headers.Authorization).toBe('Bearer sample-jwt-token');
    });

    it('does not set Authorization header if no token in sessionStorage', async () => {
        const requestInterceptor = api.interceptors.request.handlers[0].fulfilled;
        const config = { headers: {} };
        const result = await requestInterceptor(config);

        expect(result.headers.Authorization).toBeUndefined();
    });

    it('clears sessionStorage and redirects to /login on 401 for protected endpoints', async () => {
        sessionStorage.setItem('token', 'expired-token');
        sessionStorage.setItem('user', JSON.stringify({ username: 'user1' }));

        const responseErrorInterceptor = api.interceptors.response.handlers[0].rejected;
        const error = {
            config: { url: '/orders' },
            response: { status: 401, data: { message: 'Unauthorized' } },
        };

        await expect(responseErrorInterceptor(error)).rejects.toBe(error);

        expect(sessionStorage.getItem('token')).toBeNull();
        expect(sessionStorage.getItem('user')).toBeNull();
        expect(window.location.href).toBe('/login');
    });

    it('does not clear sessionStorage or redirect on 401 for /auth/login', async () => {
        sessionStorage.setItem('token', 'existing-token');
        const responseErrorInterceptor = api.interceptors.response.handlers[0].rejected;
        const error = {
            config: { url: '/auth/login' },
            response: { status: 401, data: { message: 'Bad credentials' } },
        };

        await expect(responseErrorInterceptor(error)).rejects.toBe(error);

        expect(sessionStorage.getItem('token')).toBe('existing-token');
        expect(window.location.href).not.toBe('/login');
    });

    it('does not clear sessionStorage or redirect on 401 for /portal/ routes', async () => {
        sessionStorage.setItem('token', 'existing-token');
        const responseErrorInterceptor = api.interceptors.response.handlers[0].rejected;
        const error = {
            config: { url: '/portal/quotations/test-token' },
            response: { status: 401, data: { message: 'Invalid token' } },
        };

        await expect(responseErrorInterceptor(error)).rejects.toBe(error);

        expect(sessionStorage.getItem('token')).toBe('existing-token');
        expect(window.location.href).not.toBe('/login');
    });

    it('parses Blob error response body into structured JSON if present', async () => {
        const responseErrorInterceptor = api.interceptors.response.handlers[0].rejected;
        const blobData = new Blob([JSON.stringify({ error: 'File too large' })], { type: 'application/json' });
        blobData.text = async () => JSON.stringify({ error: 'File too large' });
        const error = {
            config: { url: '/files/upload' },
            response: { status: 400, data: blobData },
        };

        await expect(responseErrorInterceptor(error)).rejects.toBe(error);
        expect(error.response.data).toEqual({ error: 'File too large' });
    });
});

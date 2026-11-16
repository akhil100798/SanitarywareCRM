// Storage may be synchronous (web sessionStorage) or asynchronous (native).
// A pending intent survives reload; uncertain responses must retry unchanged.
export const paymentErrorMessage = (error) => error.response?.data?.message
    || (error.isAxiosError && !error.response
        ? 'Could not confirm whether the payment was recorded. Retry the same details to confirm its result.'
        : error.message || 'Could not confirm the payment. Retry the same details.');

export const createPaymentIntentStore = (storage) => {
    const slot = (scope) => `crm-payment-intent:${scope}`;
    const signature = (payload) => JSON.stringify(Object.keys(payload).sort().map(key => [key, payload[key]]));
    const read = async (scope) => {
        const value = await storage.getItem(slot(scope));
        return value ? JSON.parse(value) : null;
    };
    return {
        read,
        async prepare(scope, payload) {
            const previous = await read(scope);
            const nextSignature = signature(payload);
            if (previous?.signature === nextSignature) return previous.key;
            if (previous && !previous.safeToChange) {
                throw new Error('The result of your previous payment is unknown. Retry its original details before starting a different payment.');
            }
            const key = globalThis.crypto?.randomUUID?.()
                || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
            await storage.setItem(slot(scope), JSON.stringify({ key, signature: nextSignature, payload, safeToChange: false }));
            return key;
        },
        async failed(scope, error) {
            const previous = await read(scope);
            if (!previous) return;
            const status = error.response?.status;
            previous.safeToChange = status >= 400 && status < 500 && status !== 408;
            await storage.setItem(slot(scope), JSON.stringify(previous));
        },
        async complete(scope) { await storage.removeItem(slot(scope)); }
    };
};

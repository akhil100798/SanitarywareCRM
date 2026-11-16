// Serialize session mutations so a late rejection cannot erase a newer login.
export const createSessionStore = (storage, tokenKey, userKey) => {
  let pending = Promise.resolve();
  const listeners = new Set();
  const mutate = (operation) => {
    const result = pending.then(operation);
    pending = result.catch(() => {});
    return result;
  };
  return {
    async getToken() { await pending; return storage.getItem(tokenKey); },
    async getUser() {
      await pending;
      const value = await storage.getItem(userKey);
      return value ? JSON.parse(value) : null;
    },
    setToken: (token) => mutate(() => storage.setItem(tokenKey, token)),
    setUser: (user) => mutate(() => storage.setItem(userKey, JSON.stringify(user))),
    clear: () => mutate(() => storage.multiRemove([tokenKey, userKey])),
    subscribeRejected(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    rejectToken: (token) => mutate(async () => {
      if (!token || await storage.getItem(tokenKey) !== token) return false;
      await storage.multiRemove([tokenKey, userKey]);
      listeners.forEach((listener) => listener());
      return true;
    })
  };
};

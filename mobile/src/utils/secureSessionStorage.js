export const createSecureSessionStorage = (secureStore, legacyStorage, tokenKey, options = {}) => {
  const isAvailable = async () => {
    if (options.isWeb || options.platform === 'web' || !secureStore) return false;
    if (typeof secureStore.isAvailableAsync === 'function') {
      try {
        return await secureStore.isAvailableAsync();
      } catch {
        return false;
      }
    }
    return typeof secureStore.getItemAsync === 'function';
  };

  return {
    async getItem(key) {
      if (key !== tokenKey) return legacyStorage.getItem(key);

      const available = await isAvailable();
      if (!available) {
        return legacyStorage.getItem(key);
      }

      const token = await secureStore.getItemAsync(key);
      if (token) return token;

      const legacyToken = await legacyStorage.getItem(key);
      if (legacyToken) {
        await secureStore.setItemAsync(key, legacyToken);
        await legacyStorage.removeItem(key);
      }
      return legacyToken;
    },
    async setItem(key, value) {
      if (key !== tokenKey) {
        return legacyStorage.setItem(key, value);
      }
      const available = await isAvailable();
      if (!available) {
        return legacyStorage.setItem(key, value);
      }
      return secureStore.setItemAsync(key, value);
    },
    async multiRemove(keys) {
      const available = await isAvailable();
      await Promise.all(keys.map(async (key) => {
        if (key === tokenKey) {
          const ops = [legacyStorage.removeItem(key)];
          if (available) {
            ops.push(secureStore.deleteItemAsync(key));
          }
          await Promise.all(ops);
        } else {
          await legacyStorage.removeItem(key);
        }
      }));
    }
  };
};

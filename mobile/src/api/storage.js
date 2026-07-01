import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'sanitaryware_crm_token';
const USER_KEY = 'sanitaryware_crm_user';

export const sessionStorage = {
  async getToken() {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async setToken(token) {
    return AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async getUser() {
    const value = await AsyncStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  },

  async setUser(user) {
    return AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async clear() {
    return AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }
};

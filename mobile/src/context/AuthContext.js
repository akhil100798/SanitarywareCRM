import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../api/services';
import { sessionEvents } from '../api/sessionEvents';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    const unsubscribe = sessionEvents.subscribe(() => setUser(null));
    authService
      .getStoredUser()
      .then(setUser)
      .finally(() => setBootstrapping(false));
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      user,
      bootstrapping,
      isAuthenticated: !!user,
      async login(username, password) {
        const loggedInUser = await authService.login(username, password);
        setUser(loggedInUser);
        return loggedInUser;
      },
      async logout() {
        await authService.logout();
        setUser(null);
      }
    }),
    [bootstrapping, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

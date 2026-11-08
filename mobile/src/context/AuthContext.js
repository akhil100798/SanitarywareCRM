import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../api/services';
import { sessionStorage } from '../api/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => sessionStorage.subscribeRejected(() => setUser(null)), []);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const storedUser = await authService.getStoredUser();
        if (!storedUser) {
          return null;
        }

        try {
          return await authService.getCurrentUser();
        } catch (error) {
          if (error.response?.status === 401) {
            await authService.clearSession();
            return null;
          }
          return storedUser;
        }
      } catch {
        await authService.clearSession();
        return null;
      }
    };

    restoreSession()
      .catch(() => null)
      .then((restoredUser) => {
        if (active) {
          setUser(restoredUser);
        }
      })
      .finally(() => {
        if (active) {
          setBootstrapping(false);
        }
      });

    return () => {
      active = false;
    };
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
        try {
          await authService.logout();
        } catch {
          // A failed server logout must not trap the user in a stale local session.
        } finally {
          setUser(null);
        }
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

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'clutterguard-token';
const USER_KEY = 'clutterguard-user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const response = await authService.profile();
        setUser(response.data);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setReady(true);
      }
    };
    loadProfile();
  }, [token]);

  const persistSession = (data) => {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  };

  const login = async (email, password) => {
    const response = await authService.login({ email, password });
    persistSession(response.data);
    return response.data.user;
  };

  const signup = async (fullName, email, password) => {
    const response = await authService.register({ full_name: fullName, email, password });
    persistSession(response.data);
    return response.data.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({
    token,
    user,
    ready,
    isAuthenticated: Boolean(token && user),
    login,
    signup,
    logout,
    setUser,
  }), [token, user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

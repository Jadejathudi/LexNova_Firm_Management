import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('clearcase_token');
    const savedUser = localStorage.getItem('clearcase_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch { /* ignore parse errors */ }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('clearcase_token', data.token);
    const userData = { user_id: data.user_id, role: data.role, full_name: data.full_name, email };
    localStorage.setItem('clearcase_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (full_name, email, phone, password) => {
    const data = await api.register({ full_name, email, phone, password });
    localStorage.setItem('clearcase_token', data.token);
    const userData = { user_id: data.user_id, role: data.role, full_name: data.full_name, email };
    localStorage.setItem('clearcase_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    api.logout().catch(() => {});
    localStorage.removeItem('clearcase_token');
    localStorage.removeItem('clearcase_user');
    setUser(null);
  };

  const isInternal = user && !['client'].includes(user.role);
  const isPartner = user && user.role === 'managing_partner';

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, isInternal, isPartner }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

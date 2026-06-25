'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        loadProfile();
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const loadProfile = async () => {
    try {
      const data = await authAPI.getProfile();
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch {
      logoutSilent();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await authAPI.login({ email, password });
    // API returns { token, user } directly
    const token = data.token;
    const userData = data.user;
    
    if (!token || !userData) throw new Error('Invalid response from server');
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return data;
  };

  const register = async (userData) => {
    const data = await authAPI.register(userData);
    const token = data.token;
    const user = data.user;
    
    if (!token || !user) throw new Error('Invalid response from server');
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    if (typeof window !== 'undefined') window.location.href = '/';
  };

  const logoutSilent = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const isOperator = () => {
    return user && user.role === 'operator';
  };

  const isInvestor = () => {
    return user && user.role === 'investor';
  };

  const isFranchisee = () => {
    return user && user.role === 'franchisee';
  };

  const isProvinceAgent = () => {
    return user && user.role === 'franchisee' && user.agentType === 'province_agent';
  };

  const isCityFranchisee = () => {
    return user && user.role === 'franchisee' && user.agentType === 'city_franchisee';
  };

  const canAccessAdmin = () => {
    return user && (user.role === 'admin' || user.role === 'operator');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isOperator, isInvestor, isFranchisee, isProvinceAgent, isCityFranchisee, canAccessAdmin, loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

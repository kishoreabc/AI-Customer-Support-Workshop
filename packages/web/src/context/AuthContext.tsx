import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

export interface UserSession {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SUPPORT_AGENT' | 'CUSTOMER';
  customerId?: string;
  adminId?: string;
  agentId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  department?: string;
  profile?: any;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  loading: boolean;
  loginCustomer: (email: string, pass: string) => Promise<void>;
  registerCustomer: (data: any) => Promise<void>;
  loginAdmin: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('auth_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.get<UserSession>('/api/v1/auth/me');
        setUser(data);
      } catch (err) {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const loginCustomer = async (email: string, pass: string) => {
    const res = await api.post<{ token: string; user: UserSession }>('/api/v1/auth/login', {
      email,
      password: pass,
    });
    localStorage.setItem('auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const registerCustomer = async (data: any) => {
    const res = await api.post<{ token: string; user: UserSession }>('/api/v1/auth/register', data);
    localStorage.setItem('auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const loginAdmin = async (email: string, pass: string) => {
    const res = await api.post<{ token: string; user: UserSession }>('/api/v1/auth/admin/login', {
      email,
      password: pass,
    });
    localStorage.setItem('auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginCustomer, registerCustomer, loginAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

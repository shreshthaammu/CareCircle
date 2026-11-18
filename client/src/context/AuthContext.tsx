import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

export interface AuthSession {
  circleId: string;
  circleCode: string;
  role: 'ELDER' | 'CARETAKER' | 'FAMILY';
  elderName: string;
  language: 'en' | 'hi' | 'te';
}

interface AuthContextType {
  session: AuthSession | null;
  circle: any | null;
  loading: boolean;
  login: (circleCode: string, passcode: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [circle, setCircle] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const data = await api.getMe();
      setSession(data.session);
      setCircle(data.circle);
    } catch {
      setSession(null);
      setCircle(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (circleCode: string, passcode: string) => {
    const res = await api.joinCircle(circleCode, passcode);
    setSession(res.session);
    await fetchSession();
  };

  const logout = async () => {
    await api.logout();
    setSession(null);
    setCircle(null);
  };

  const refresh = async () => {
    await fetchSession();
  };

  return (
    <AuthContext.Provider value={{ session, circle, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

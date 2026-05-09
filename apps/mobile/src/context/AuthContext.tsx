import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const C = createContext<any>(null);
export const useAuth = () => useContext(C);

export function AuthProvider({ children }: { children: any }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('token');
        if (stored) {
          const j = await api('/api/auth/me');
          setToken(stored);
          setUser(j.user);
        }
      } catch {
        await AsyncStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const j = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    await AsyncStorage.setItem('token', j.token);
    setToken(j.token);
    setUser(j.user);
  }

  async function register(fullName: string, email: string, phone: string, password: string) {
    const j = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      }),
    });
    await AsyncStorage.setItem('token', j.token);
    setToken(j.token);
    setUser(j.user);
  }

  async function logout() {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  return (
    <C.Provider value={{ token, user, isLoading, login, register, logout, setUser, setToken }}>
      {children}
    </C.Provider>
  );
}


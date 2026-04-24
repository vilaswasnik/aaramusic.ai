import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const TOKEN_KEY = 'aara_token';

// Resolve the API base URL — works in both browser and native
function getApiBase(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return 'http://localhost:8082';
}

async function authFetch(path: string, options: RequestInit = {}) {
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then(async token => {
      if (token) {
        try {
          const data = await authFetch('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(data.user);
        } catch {
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const data = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const data = await authFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  };

  const signOut = async () => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      await authFetch('/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    await authFetch('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

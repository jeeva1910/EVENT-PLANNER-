import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IUser, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    department?: string;
    organization?: string;
  }) => Promise<void>;
  logout: () => void;
  updateUserProfile: (data: Partial<IUser>) => Promise<void>;
  setUserDirectly: (updatedUser: IUser) => void;
  loginDemo: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('eventhub_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (error) {
          console.warn('Session expired or invalid token');
          localStorage.removeItem('eventhub_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('eventhub_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    department?: string;
    organization?: string;
  }) => {
    const res = await api.register(data);
    localStorage.setItem('eventhub_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('eventhub_token');
    setToken(null);
    setUser(null);
  };

  const updateUserProfile = async (data: Partial<IUser>) => {
    const res = await api.updateProfile(data);
    setUser(res.user);
  };

  const setUserDirectly = (updatedUser: IUser) => {
    setUser(updatedUser);
  };

  const loginDemo = async (role: UserRole) => {
    const credentials = {
      attendee: { email: 'attendee@eventhub.com', pass: 'Attendee123!' },
      organizer: { email: 'organizer@eventhub.com', pass: 'Organizer123!' },
      admin: { email: 'admin@eventhub.com', pass: 'Admin123!' }
    }[role];

    await login(credentials.email, credentials.pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUserProfile,
        setUserDirectly,
        loginDemo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

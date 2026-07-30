import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/client.js';

interface AuthContextType {
  account: any | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (userName: string, password: string) => Promise<void>;
  logout: () => void;
  setPassword: (password: string, currentPassword?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('authToken')
  );
  const [isLoading, setIsLoading] = useState(false);

  // Restore session on mount
  useEffect(() => {
    if (token && !account) {
      setIsLoading(true);
      // Could fetch current account here if needed
      setIsLoading(false);
    }
  }, [token, account]);

  const login = async (userName: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authApi.login(userName, password);
      setToken(result.token);
      setAccount(result.account);
      localStorage.setItem('authToken', result.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setAccount(null);
    localStorage.removeItem('authToken');
  };

  const setPassword = async (password: string, currentPassword?: string) => {
    await authApi.setPassword(password, currentPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        account,
        token,
        isLoggedIn: !!token,
        isLoading,
        login,
        logout,
        setPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

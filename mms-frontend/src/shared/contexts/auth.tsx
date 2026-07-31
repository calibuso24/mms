import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { accountApi, authApi } from '../api/client.js';
import { CurrentAccount } from '../types/account.js';

interface AuthContextType {
  account: CurrentAccount | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (userName: string, password: string) => Promise<void>;
  logout: () => void;
  setPassword: (password: string, currentPassword?: string) => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<CurrentAccount | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('authToken')
  );
  const [isLoading, setIsLoading] = useState(false);

  const refreshAccount = async () => {
    const me = await accountApi.getMe();
    setAccount(me);
  };

  // Restore session on mount
  useEffect(() => {
    if (token && !account) {
      setIsLoading(true);
      refreshAccount()
        .catch(() => {
          localStorage.removeItem('authToken');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
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
        refreshAccount,
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

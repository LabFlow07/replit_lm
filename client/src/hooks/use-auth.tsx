import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/api";

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  company?: {
    id: string;
    name: string;
    type: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('qlm_token');
    if (token) {
      // Validate token with a simple API call
      fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (response.ok) {
          // Token is valid, try to get user info from JWT payload
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({
              id: payload.id,
              username: payload.username,
              role: payload.role,
              name: payload.username,
              email: `${payload.username}@qlm.com`
            });
          } catch (e) {
            console.error('Error parsing token:', e);
            localStorage.removeItem('qlm_token');
          }
        } else {
          // Token is invalid
          localStorage.removeItem('qlm_token');
          setUser(null);
        }
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('qlm_token');
        setUser(null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Invalid credentials');
      }

      const data = await response.json();
      console.log('Login response user data:', data.user);
      console.log('User role:', data.user.role, 'Company ID:', data.user.companyId);
      localStorage.setItem('qlm_token', data.token);
      setUser(data.user);
      setLoading(false);
      console.log('Login successful, token saved:', data.token.substring(0, 20) + '...');
    } catch (error) {
      console.error('Login error:', error);
      setUser(null);
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('qlm_token');
    setUser(null);
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
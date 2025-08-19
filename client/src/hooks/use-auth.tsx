import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/api";

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  companyId?: string;
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
  forceReauth: () => void;
  isTokenValid: () => Promise<boolean>;
  refreshAuth: () => Promise<boolean>;
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

  const checkTokenValidity = async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch (e) {
      console.error('Error parsing or validating token:', e);
      localStorage.removeItem('token');
      setUser(null);
      return false;
    }
  };

  const refreshAuth = async (): Promise<boolean> => {
    const token = localStorage.getItem('token');

    if (!token || !(await checkTokenValidity())) {
      logout();
      return false;
    }

    try {
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('User data after refresh:', userData);
        setUser({
          id: userData.id,
          username: userData.username,
          name: userData.name || userData.username,
          email: userData.email || '',
          role: userData.role,
          companyId: userData.companyId || null,
          company: userData.company
        });
        return true;
      } else {
        console.log('Token refresh failed (API returned error), clearing and redirecting to login...');
        logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed (network error):', error);
      logout();
      return false;
    }
  };


  // Define logout function before using it
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('token'); // Remove old token key as well
    setUser(null);
    console.log('User logged out, redirecting to login...');
    setLocation('/login');
  };

  const forceReauth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('token'); // Remove old token key as well
    setUser(null);
    setLoading(false);
    setLocation('/login'); // Ensure redirect on forced reauthentication
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        const isValid = await checkTokenValidity();
        if (isValid) {
          const refreshed = await refreshAuth();
          if (!refreshed) {
            setLocation('/login');
          }
        } else {
          console.log('Token invalid on initial load, redirecting to login...');
          setLocation('/login'); // Redirect to login if token is invalid on initial load
        }
      } else {
        setLocation('/login'); // Redirect to login if no token is found
      }
      setLoading(false);
    };

    initAuth();
  }, [setLocation]); // Depend on setLocation for redirection

  // Check token validity periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      if (user) { // Only check if there's a user logged in
        const isValid = checkTokenValidity();
        if (!isValid) {
          console.log('Token expired, user will be logged out and redirected to login');
          logout(); // Use logout to handle state reset and redirection
        } else {
          // Optionally refresh auth data if token is valid but might be stale
          await refreshAuth();
        }
      }
    }, 15 * 60 * 1000); // Check every 15 minutes

    return () => clearInterval(interval); // Cleanup interval on component unmount or user change
  }, [user, logout, setLocation]); // Rerun effect if user, logout, or setLocation changes

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
      localStorage.setItem('token', data.token);

      // Ensure companyId is properly set from login response
      const userData = data.user;
      console.log('Login successful, user data received:', userData);

      // Set user data from response - ensure all company data is properly mapped
      setUser({
        id: userData.id,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        companyId: userData.companyId || userData.company_id,
        company: userData.company
      });

      console.log('User state set with company info:', {
        role: userData.role,
        companyId: userData.companyId || userData.company_id,
        company: userData.company
      });

      setLoading(false);
      console.log('Login successful, token saved:', data.token.substring(0, 20) + '...');
    } catch (error) {
      console.error('Login error:', error);
      setUser(null);
      setLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      forceReauth,
      isTokenValid: checkTokenValidity,
      refreshAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}
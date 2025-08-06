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
    const token = localStorage.getItem('qlm_token');
    if (!token) {
      return false;
    }

    try {
      // Validate token with a simple API call
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Token is valid, try to get user info from JWT payload
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Token payload on validation:', payload);
          console.log('CompanyId from token:', payload.companyId);

          // Log the full payload to debug
          console.log('Full token payload:', payload);
          console.log('CompanyId from token payload:', payload.companyId);

          setUser({
            id: payload.id,
            username: payload.username,
            name: payload.name || payload.username,
            email: payload.email || '',
            role: payload.role,
            companyId: payload.companyId || null,
            company: undefined // Company data might need to be fetched separately if not in token
          });
          return true;
        } catch (e) {
          console.error('Error parsing token:', e);
          localStorage.removeItem('qlm_token');
          setUser(null);
          return false;
        }
      } else {
        // Token is invalid
        console.log('Token invalid, clearing and redirecting to login...');
        localStorage.removeItem('qlm_token');
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('qlm_token');
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('qlm_token');
      if (token) {
        const isValid = await checkTokenValidity();
        if (!isValid) {
          setLocation('/login'); // Redirect to login if token is invalid on initial load
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [setLocation]); // Depend on setLocation for redirection

  // Check token validity periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      if (user) { // Only check if there's a user logged in
        const isValid = await checkTokenValidity();
        if (!isValid) {
          console.log('Token expired, user will be redirected to login');
          logout(); // Use logout to handle state reset and redirection
          setLocation('/login'); // Explicitly redirect to login
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

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
      localStorage.setItem('qlm_token', data.token);

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

  const logout = () => {
    localStorage.removeItem('qlm_token');
    setUser(null);
    setLocation('/login');
  };

  const forceReauth = () => {
    localStorage.removeItem('qlm_token');
    setUser(null);
    setLoading(false);
    setLocation('/login'); // Ensure redirect on forced reauthentication
  };

  // Function to manually update token (for debugging)
  const updateToken = (newToken: string) => {
    localStorage.setItem('qlm_token', newToken);
    try {
      const payload = JSON.parse(atob(newToken.split('.')[1]));
      setUser({
        id: payload.id,
        username: payload.username,
        name: payload.name || payload.username,
        email: payload.email || '',
        role: payload.role,
        companyId: payload.companyId || null,
        company: undefined // Company data might need to be fetched separately if not in token
      });
      console.log('Token updated successfully:', payload);
    } catch (e) {
      console.error('Error parsing new token:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, forceReauth }}>
      {children}
    </AuthContext.Provider>
  );
}
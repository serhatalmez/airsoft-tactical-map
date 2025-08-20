import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
    username: string;
    isGuest: boolean;
    avatar?: string;
    createdAt: string;
  };
}

interface AuthState {
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        if (sessionData.access_token && sessionData.expires_at > Date.now()) {
          setSession(sessionData);
        } else {
          localStorage.removeItem('session');
        }
      } catch (error) {
        localStorage.removeItem('session');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.data.session) {
        const sessionData = {
          access_token: data.data.session.access_token,
          refresh_token: data.data.session.refresh_token,
          expires_at: data.data.session.expires_at * 1000,
          user: data.data.user,
        };
        localStorage.setItem('session', JSON.stringify(sessionData));
        setSession(sessionData);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, username: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, confirmPassword: password, username }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.data.session) {
          const sessionData = {
            access_token: data.data.session.access_token,
            refresh_token: data.data.session.refresh_token,
            expires_at: data.data.session.expires_at * 1000,
            user: data.data.user,
          };
          localStorage.setItem('session', JSON.stringify(sessionData));
          setSession(sessionData);
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (session?.access_token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('session');
      setSession(null);
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      if (!session?.access_token) return false;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const updatedSession = {
          ...session,
          user: data.data.user,
        };
        localStorage.setItem('session', JSON.stringify(updatedSession));
        setSession(updatedSession);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  };

  return {
    session,
    loading,
    login,
    register,
    logout,
    refreshSession,
  };
}

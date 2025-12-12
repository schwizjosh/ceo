import { useState, useCallback, useEffect, useRef } from 'react';
import { User } from '../types';
import { apiClient } from '../lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

// Demo credentials
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@andorabrand.me';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '898and.8888';
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || 'demo@andorabrand.me';
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || '898dora.8888';

// Demo user data
const DEMO_USER: User = {
  user_id: 'demo-user-123',
  plan: 'pro',
  tokens: 1500,
  plan_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  preferred_ai_provider: 'openai',
  preferred_ai_model: 'gpt-4',
  timezone: 'Africa/Lagos'
};

const ADMIN_USER: User = {
  user_id: 'admin-user-123',
  plan: 'enterprise',
  tokens: 999999,
  preferred_ai_provider: 'claude',
  preferred_ai_model: 'claude-3-opus-20240229',
  timezone: 'Africa/Lagos'
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    loading: true,
    error: null
  });

  const hasInitialized = useRef(false);

  const isDemoAccount = (email: string) => {
    return email === DEMO_EMAIL || email === ADMIN_EMAIL;
  };

  const loadDemoUser = useCallback((email: string) => {
    const user = email === ADMIN_EMAIL ? ADMIN_USER : DEMO_USER;
    setAuthState({
      user,
      isAuthenticated: true,
      isAdmin: email === ADMIN_EMAIL,
      loading: false,
      error: null
    });
  }, []);

  // Initialize auth - check for existing session
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeAuth = async () => {
      console.log('🔄 Initializing auth...');

      try {
        const user = await apiClient.getCurrentUser();
        
        if (user) {
          console.log('✅ Found session:', user.email);
          setAuthState({
            user: {
              user_id: user.user_id,
              plan: user.plan,
              tokens: user.tokens,
              plan_expiry: user.plan_expiry ? new Date(user.plan_expiry) : undefined,
              preferred_ai_provider: user.preferred_ai_provider,
              preferred_ai_model: user.preferred_ai_model,
              timezone: user.timezone
            },
            isAuthenticated: true,
            isAdmin: user.is_admin || false,
            loading: false,
            error: null
          });
        } else {
          console.log('ℹ️ No session found');
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('❌ Init error:', error);
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    console.log('🔄 Login attempt:', email);
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    // Handle demo accounts
    if (isDemoAccount(email)) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const isValidDemo = (email === DEMO_EMAIL && password === DEMO_PASSWORD) ||
                         (email === ADMIN_EMAIL && password === ADMIN_PASSWORD);

      if (isValidDemo) {
        loadDemoUser(email);
        return;
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: 'Invalid credentials. Please check your email and password.'
        }));
        return;
      }
    }

    // Handle real users via API
    try {
      const user = await apiClient.login(email, password);
      
      console.log('✅ Login successful');
      setAuthState({
        user: {
          user_id: user.user_id,
          plan: user.plan,
          tokens: user.tokens,
          plan_expiry: user.plan_expiry ? new Date(user.plan_expiry) : undefined,
          preferred_ai_provider: user.preferred_ai_provider,
          preferred_ai_model: user.preferred_ai_model,
          timezone: user.timezone
        },
        isAuthenticated: true,
        isAdmin: user.is_admin || false,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      let errorMessage = 'Invalid credentials. Please check your email and password.';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, [loadDemoUser]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    console.log('🔄 Registration:', email);
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    if (isDemoAccount(email)) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Cannot register with demo email addresses'
      }));
      return;
    }

    try {
      const user = await apiClient.register(email, password, name);

      // Create a default brand for the new user
      try {
        await apiClient.createBrand({
          name: `${name}'s Brand`,
          mission: 'Our mission is...',
          vision: 'Our vision is...',
          values: 'Our values are...',
          voice: 'Our brand voice is...',
        });
        console.log('✅ Default brand created successfully');
      } catch (brandError) {
        console.error('❌ Failed to create default brand:', brandError);
        // Non-critical error, user can create a brand later
      }
      
      console.log('✅ User registered successfully');
      setAuthState({
        user: {
          user_id: user.user_id,
          plan: user.plan,
          tokens: user.tokens,
          plan_expiry: user.plan_expiry ? new Date(user.plan_expiry) : undefined,
          preferred_ai_provider: user.preferred_ai_provider,
          preferred_ai_model: user.preferred_ai_model,
          timezone: user.timezone
        },
        isAuthenticated: true,
        isAdmin: false,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('❌ Registration error:', error);

      let errorMessage = 'Registration failed';
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          errorMessage = 'This email is already registered. Please try logging in.';
        } else {
          errorMessage = error.message;
        }
      }

      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('🔄 Logging out...');

    try {
      // For demo accounts, just clear state
      if (authState.user && (authState.user.user_id === 'demo-user-123' || authState.user.user_id === 'admin-user-123')) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          loading: false,
          error: null
        });
        return;
      }

      // For real users, clear token
      apiClient.logout();

      setAuthState({
        user: null,
        isAuthenticated: false,
        isAdmin: false,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }, [authState.user]);

  return {
    authUser: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isAdmin: authState.isAdmin,
    authLoading: authState.loading,
    authError: authState.error,
    login,
    register,
    logout
  };
};

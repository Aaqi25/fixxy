import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authApi from './api';
import type { AuthContextValue, AuthState, SafeStudentDto } from './auth.types';

export const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  student: null,
  isAuthenticated: false,
  isLoading: true, // Start loading until /me check completes
  error: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const setStudent = (student: SafeStudentDto | null) => {
    setState((prev) => ({
      ...prev,
      student,
      isAuthenticated: student !== null,
      isLoading: false,
      error: null,
    }));
  };

  const setError = (error: string) => {
    setState((prev) => ({ ...prev, error, isLoading: false }));
  };

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Refresh authenticated user from backend. Called on app start.
   */
  const refreshUser = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const student = await authApi.getCurrentStudent();
      setStudent(student);
    } catch (err: any) {
      // Network error — server may be down
      console.error('[FIXXY] Failed to restore authentication:', err.message);
      setStudent(null);
    }
  }, []);

  /**
   * On app mount, restore authentication state from HttpOnly cookie.
   */
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { student } = await authApi.login(email, password);
      setStudent(student);
    } catch (err: any) {
      const msg =
        err.status === 401
          ? 'Invalid email or password'
          : err.status === 0 || err.message?.includes('fetch')
          ? "Couldn't connect to FIXXY. Check your connection and try again."
          : err.message || 'Something went wrong. Please try again.';
      setError(msg);
      throw err;
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, confirmPassword: string) => {
      // Client-side confirm password check
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        throw new Error('Passwords do not match');
      }
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        await authApi.register(name, email, password);
        // After registration, log the user in automatically
        const { student } = await authApi.login(email, password);
        setStudent(student);
      } catch (err: any) {
        const msg =
          err.status === 409
            ? 'Email is already registered. Try signing in instead.'
            : err.status === 400 && err.errors
            ? Object.values(err.errors as Record<string, string>)[0]
            : err.status === 0 || err.message?.includes('fetch')
            ? "Couldn't connect to FIXXY. Check your connection and try again."
            : err.message || 'Something went wrong. Please try again.';
        setError(msg);
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await authApi.logout();
    } catch {
      // Always clear client state even if server fails
    } finally {
      setStudent(null);
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

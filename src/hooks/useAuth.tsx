import { useState, useEffect } from 'react';
import { User, AuthState } from '../types';
import { logout } from '../services/authService';

/**
 * Authentication hook
 * Manages user authentication state and provides auth methods
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    // Check for existing session in localStorage
    const checkAuth = () => {
      try {
        const userStr = localStorage.getItem('user');
        
        if (userStr) {
          const user: User = JSON.parse(userStr);
          setAuthState({
            user,
            isAuthenticated: true,
            loading: false,
          });
        } else {
          setAuthState({
            user: null,
            isAuthenticated: false,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthState({
          user: null,
          isAuthenticated: false,
          loading: false,
        });
      }
    };

    checkAuth();
  }, []);

  const signOut = () => {
    logout();
    setAuthState({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
  };

  const updateUser = (updatedUser: User) => {
    try {
      // Update user in localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
        isAuthenticated: true,
      }));
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  return {
    ...authState,
    signOut,
    updateUser,
  };
}

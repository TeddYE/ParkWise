import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/authService';
import { User } from '../types';

/**
 * Enhanced authentication hook with direct service integration
 * Provides auth state and methods with improved error handling
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(currentUser !== null);
      } catch (error) {
        console.error('Failed to load user:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AuthService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  const updateUser = useCallback(async (updatedUser: User) => {
    try {
      const success = await AuthService.updateUser(updatedUser);
      if (success) {
        setUser(updatedUser);
        setIsAuthenticated(true);
      }
      return success;
    } catch (error) {
      console.error('Update user error:', error);
      return false;
    }
  }, []);

  return {
    user,
    isAuthenticated,
    loading,
    signOut,
    updateUser,
    setLoading,
  };
}

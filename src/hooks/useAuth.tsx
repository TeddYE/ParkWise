import { useAuthContext } from '../contexts/AuthContext';

/**
 * Enhanced authentication hook with context integration
 * Provides auth state and methods with improved error handling
 */
export function useAuth() {
  const { state, signOut, updateUser, setLoading } = useAuthContext();

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    signOut,
    updateUser,
    setLoading,
  };
}

import { 
  User, 
  LoginCredentials, 
  SignupCredentials, 
  AuthResponse, 
  LoginApiResponse, 
  SignupApiResponse
} from '@/types';
import { apiClient } from '@/api/client';
import { cacheManager } from '@/api/cache';
import { API_ENDPOINTS } from '@/api/endpoints';
import { AuthTransformer } from './transformers';
import { validatePassword } from '@/utils/validation';

/**
 * Refactored Authentication Service using centralized API client
 */
export class AuthService {
  private static readonly CACHE_NAMESPACE = 'auth';
  private static readonly TOKEN_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly USER_STORAGE_KEY = 'user';
  private static readonly SESSION_STORAGE_KEY = 'auth_session';

  /**
   * Login user with enhanced error handling and caching
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Attempting login with centralized API client...');

      const response = await apiClient.post<LoginApiResponse>(
        API_ENDPOINTS.LOGIN,
        credentials,
        {
          timeout: 10000, // 10 seconds
          retries: 2,
          headers: {
            'Accept': '*/*',
          },
        }
      );

      if (!response.success) {
        return {
          error: this.getLoginErrorMessage(response.error),
        };
      }

      // Transform API response to User object
      const user = AuthTransformer.transformLoginResponse(response.data, credentials.email);

      // Validate transformed user data
      if (!AuthTransformer.validateUser(user)) {
        console.error('Invalid user data received from API');
        return {
          error: 'Invalid user data received. Please try again.',
        };
      }

      // Store user data securely
      await this.storeUserData(user);

      // Cache session data
      await this.cacheSessionData(user);

      console.log('Login successful');
      return { user };

    } catch (error) {
      console.error('Login error:', error);
      return {
        error: this.getLoginErrorMessage(error),
      };
    }
  }

  /**
   * Sign up user with validation and error handling
   */
  static async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      // Client-side validation
      const passwordValidation = validatePassword(credentials.password);
      if (!passwordValidation.isValid) {
        return {
          error: passwordValidation.errors[0],
        };
      }

      console.log('Attempting signup with centralized API client...');

      const response = await apiClient.post<SignupApiResponse>(
        API_ENDPOINTS.SIGNUP,
        credentials,
        {
          timeout: 10000, // 10 seconds
          retries: 2,
          headers: {
            'Accept': '*/*',
          },
        }
      );

      if (!response.success) {
        return {
          error: this.getSignupErrorMessage(response.error),
        };
      }

      // Check for API-level errors in response data
      if (response.data.error) {
        return {
          error: this.getSignupErrorMessage(response.data.error),
        };
      }

      // Transform API response to User object
      const user = AuthTransformer.transformSignupResponse(response.data, credentials.email);

      // Validate transformed user data
      if (!AuthTransformer.validateUser(user)) {
        console.error('Invalid user data received from signup API');
        return {
          error: 'Invalid user data received. Please try again.',
        };
      }

      // Store user data securely
      await this.storeUserData(user);

      // Cache session data
      await this.cacheSessionData(user);

      console.log('Signup successful');
      return { user };

    } catch (error) {
      console.error('Signup error:', error);
      return {
        error: this.getSignupErrorMessage(error),
      };
    }
  }

  /**
   * Logout user with proper cleanup
   */
  static async logout(): Promise<void> {
    try {
      console.log('Logging out user...');

      // Clear localStorage
      localStorage.removeItem(this.USER_STORAGE_KEY);
      localStorage.removeItem(this.SESSION_STORAGE_KEY);

      // Clear auth cache
      await cacheManager.invalidate(this.CACHE_NAMESPACE);

      console.log('Logout completed');
    } catch (error) {
      console.error('Logout error:', error);
      // Still remove local storage even if cache clearing fails
      localStorage.removeItem(this.USER_STORAGE_KEY);
      localStorage.removeItem(this.SESSION_STORAGE_KEY);
    }
  }

  /**
   * Get current user from storage with validation
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      // Try cache first
      const cachedUser = await cacheManager.get<User>(this.CACHE_NAMESPACE, 'current-user');
      if (cachedUser && AuthTransformer.validateUser(cachedUser)) {
        return cachedUser;
      }

      // Try localStorage
      const storedData = localStorage.getItem(this.USER_STORAGE_KEY);
      if (!storedData) {
        return null;
      }

      const user = AuthTransformer.deserializeUserFromStorage(storedData);
      
      // Validate user data
      if (!AuthTransformer.validateUser(user)) {
        console.warn('Invalid stored user data, clearing...');
        await this.logout();
        return null;
      }

      // Check if subscription is still active
      if (!AuthTransformer.isSubscriptionActive(user)) {
        console.log('User subscription expired, updating to free');
        user.subscription = 'free';
        user.subscriptionExpiry = undefined;
        await this.storeUserData(user);
      }

      // Cache the valid user
      await cacheManager.set(this.CACHE_NAMESPACE, 'current-user', user, {
        ttl: this.TOKEN_CACHE_TTL,
      });

      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      // Clear potentially corrupted data
      await this.logout();
      return null;
    }
  }

  /**
   * Update user data with validation
   */
  static async updateUser(updatedUser: User): Promise<boolean> {
    try {
      // Validate updated user data
      if (!AuthTransformer.validateUser(updatedUser)) {
        console.error('Invalid user data for update');
        return false;
      }

      // Store updated data
      await this.storeUserData(updatedUser);

      // Update cache
      await cacheManager.set(this.CACHE_NAMESPACE, 'current-user', updatedUser, {
        ttl: this.TOKEN_CACHE_TTL,
      });

      console.log('User data updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Get user display name
   */
  static getUserDisplayName(user: User): string {
    return AuthTransformer.getUserDisplayName(user);
  }

  /**
   * Store user data securely in localStorage
   */
  private static async storeUserData(user: User): Promise<void> {
    try {
      const serializedUser = AuthTransformer.serializeUserForStorage(user);
      localStorage.setItem(this.USER_STORAGE_KEY, serializedUser);

      // Store session metadata
      const sessionData = {
        loginTime: new Date().toISOString(),
        userId: user.user_id,
      };
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error storing user data:', error);
      throw new Error('Failed to store user data');
    }
  }

  /**
   * Cache session data for performance
   */
  private static async cacheSessionData(user: User): Promise<void> {
    try {
      await cacheManager.set(this.CACHE_NAMESPACE, 'current-user', user, {
        ttl: this.TOKEN_CACHE_TTL,
      });

      await cacheManager.set(this.CACHE_NAMESPACE, 'session-active', true, {
        ttl: this.TOKEN_CACHE_TTL,
      });
    } catch (error) {
      console.error('Error caching session data:', error);
      // Don't throw - caching failure shouldn't break authentication
    }
  }

  /**
   * Get user-friendly login error message
   */
  private static getLoginErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      if (error.includes('401') || error.includes('invalid') || error.includes('unauthorized')) {
        return 'You have entered an invalid username or password.';
      }
      if (error.includes('network') || error.includes('timeout')) {
        return 'Network error. Please check your connection and try again.';
      }
    }
    
    return 'You have entered an invalid username or password.';
  }

  /**
   * Get user-friendly signup error message
   */
  private static getSignupErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      if (error.includes('Email already exists') || error.includes('already exists')) {
        return 'Email already exists. Please sign up with a different email.';
      }
      if (error.includes('network') || error.includes('timeout')) {
        return 'Network error. Please check your connection and try again.';
      }
    }
    
    return 'Signup failed. Please try again.';
  }

  /**
   * Clear all authentication data (for debugging/admin)
   */
  static async clearAllAuthData(): Promise<void> {
    try {
      await this.logout();
      console.log('All authentication data cleared');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  /**
   * Subscribe user to premium plan
   */
  static async subscribeUser(user: User, plan: 'monthly' | 'annual'): Promise<AuthResponse> {
    try {
      const { SubscriptionService } = await import('./subscriptionService');
      const result = await SubscriptionService.subscribe(user, plan);
      
      if (result.error) {
        return { error: result.error };
      }

      if (result.user) {
        // Update stored user data
        await this.storeUserData(result.user);
        
        // Update cache
        await cacheManager.set(this.CACHE_NAMESPACE, 'current-user', result.user, {
          ttl: this.TOKEN_CACHE_TTL,
        });

        return { user: result.user };
      }

      return { error: 'Subscription failed. Please try again.' };
    } catch (error) {
      console.error('Subscription error:', error);
      return { error: 'Subscription failed. Please try again.' };
    }
  }

  /**
   * Get user's subscription status
   */
  static getSubscriptionStatus(user: User): {
    isPremium: boolean;
    isActive: boolean;
    daysRemaining?: number;
    expiryDate?: Date;
    canUpgrade: boolean;
  } {
    const subscriptionInfo = AuthTransformer.getSubscriptionInfo(user);
    
    return {
      isPremium: user.subscription === 'premium',
      isActive: subscriptionInfo.isActive,
      daysRemaining: subscriptionInfo.daysRemaining,
      expiryDate: subscriptionInfo.expiryDate,
      canUpgrade: !subscriptionInfo.isActive,
    };
  }

  /**
   * Check if user can access premium features
   */
  static canAccessPremiumFeatures(user: User): boolean {
    return AuthTransformer.canAccessPremiumFeatures(user);
  }

  /**
   * Update user's favorite carparks
   */
  static async updateUserFavorites(user: User, favoriteCarparks: string[]): Promise<AuthResponse> {
    try {
      const { FavoritesService } = await import('./favoritesService');
      const result = await FavoritesService.updateFavorites(user, favoriteCarparks);
      
      if (result.error) {
        return { error: result.error };
      }

      if (result.user) {
        // Update stored user data
        await this.storeUserData(result.user);
        
        // Update cache
        await cacheManager.set(this.CACHE_NAMESPACE, 'current-user', result.user, {
          ttl: this.TOKEN_CACHE_TTL,
        });

        return { user: result.user };
      }

      return { error: 'Failed to update favorites. Please try again.' };
    } catch (error) {
      console.error('Update favorites error:', error);
      return { error: 'Failed to update favorites. Please try again.' };
    }
  }

  /**
   * Add carpark to user's favorites
   */
  static async addFavoriteCarpark(user: User, carparkId: string): Promise<AuthResponse> {
    try {
      const { FavoritesService } = await import('./favoritesService');
      const result = await FavoritesService.addFavorite(user, carparkId);
      
      if (result.error) {
        return { error: result.error };
      }

      if (result.user) {
        // Update stored user data
        await this.storeUserData(result.user);
        
        // Update cache
        await cacheManager.set(this.CACHE_NAMESPACE, 'current-user', result.user, {
          ttl: this.TOKEN_CACHE_TTL,
        });

        return { user: result.user };
      }

      return { error: 'Failed to add favorite. Please try again.' };
    } catch (error) {
      console.error('Add favorite error:', error);
      return { error: 'Failed to add favorite. Please try again.' };
    }
  }

  /**
   * Remove carpark from user's favorites
   */
  static async removeFavoriteCarpark(user: User, carparkId: string): Promise<AuthResponse> {
    try {
      const { FavoritesService } = await import('./favoritesService');
      const result = await FavoritesService.removeFavorite(user, carparkId);
      
      if (result.error) {
        return { error: result.error };
      }

      if (result.user) {
        // Update stored user data
        await this.storeUserData(result.user);
        
        // Update cache
        await cacheManager.set(this.CACHE_NAMESPACE, 'current-user', result.user, {
          ttl: this.TOKEN_CACHE_TTL,
        });

        return { user: result.user };
      }

      return { error: 'Failed to remove favorite. Please try again.' };
    } catch (error) {
      console.error('Remove favorite error:', error);
      return { error: 'Failed to remove favorite. Please try again.' };
    }
  }

  /**
   * Toggle carpark favorite status
   */
  static async toggleFavoriteCarpark(user: User, carparkId: string): Promise<AuthResponse & { action?: 'added' | 'removed' }> {
    try {
      const { FavoritesService } = await import('./favoritesService');
      const result = await FavoritesService.toggleFavorite(user, carparkId);
      
      if (result.error) {
        return { error: result.error };
      }

      if (result.user) {
        // Update stored user data
        await this.storeUserData(result.user);
        
        // Update cache
        await cacheManager.set(this.CACHE_NAMESPACE, 'current-user', result.user, {
          ttl: this.TOKEN_CACHE_TTL,
        });

        return { user: result.user, action: result.action };
      }

      return { error: 'Failed to toggle favorite. Please try again.' };
    } catch (error) {
      console.error('Toggle favorite error:', error);
      return { error: 'Failed to toggle favorite. Please try again.' };
    }
  }

  /**
   * Get authentication cache statistics
   */
  static async getCacheStats(): Promise<{ size: number; namespaces: string[] }> {
    return cacheManager.getStats(this.CACHE_NAMESPACE);
  }
}

// Export individual functions for backward compatibility
export const login = AuthService.login.bind(AuthService);
export const signup = AuthService.signup.bind(AuthService);
export const logout = AuthService.logout.bind(AuthService);
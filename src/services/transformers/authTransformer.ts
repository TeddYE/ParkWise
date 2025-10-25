import { User, LoginApiResponse, SignupApiResponse } from '@/types';

/**
 * Authentication data transformation utilities
 */
export class AuthTransformer {
  /**
   * Transform login API response to User object
   */
  static transformLoginResponse(apiResponse: LoginApiResponse, email: string): User {
    try {
      // Parse profile data (can be string or object)
      const profile = typeof apiResponse.profile === 'string' 
        ? JSON.parse(apiResponse.profile) 
        : apiResponse.profile;

      return {
        user_id: apiResponse.user_id,
        name: profile?.name,
        email: email,
        subscription: profile?.is_premium === 'yes' ? 'premium' : 'free',
        subscriptionExpiry: profile?.subscriptionExpiry 
          ? new Date(profile.subscriptionExpiry) 
          : undefined,
        favoriteCarparks: profile?.favoriteCarparks || [],
      };
    } catch (error) {
      console.error('Error transforming login response:', error);
      
      // Return minimal user object as fallback
      return {
        user_id: apiResponse.user_id,
        email: email,
        subscription: 'free',
        favoriteCarparks: [],
      };
    }
  }

  /**
   * Transform signup API response to User object
   */
  static transformSignupResponse(apiResponse: SignupApiResponse, email: string): User {
    try {
      const profile = apiResponse.profile;

      return {
        user_id: apiResponse.user_id || email, // Fallback to email if no user_id
        name: profile?.name,
        email: email,
        subscription: profile?.is_premium === 'yes' ? 'premium' : 'free',
        subscriptionExpiry: profile?.subscriptionExpiry 
          ? new Date(profile.subscriptionExpiry) 
          : undefined,
        favoriteCarparks: profile?.favoriteCarparks || [],
      };
    } catch (error) {
      console.error('Error transforming signup response:', error);
      
      // Return minimal user object as fallback
      return {
        user_id: email,
        email: email,
        subscription: 'free',
        favoriteCarparks: [],
      };
    }
  }

  /**
   * Transform user object for storage (serialize dates, etc.)
   */
  static serializeUserForStorage(user: User): string {
    try {
      const serializable = {
        ...user,
        subscriptionExpiry: user.subscriptionExpiry?.toISOString(),
      };
      return JSON.stringify(serializable);
    } catch (error) {
      console.error('Error serializing user for storage:', error);
      throw new Error('Failed to serialize user data');
    }
  }

  /**
   * Transform stored user data back to User object
   */
  static deserializeUserFromStorage(storedData: string): User {
    try {
      const parsed = JSON.parse(storedData);
      
      return {
        ...parsed,
        subscriptionExpiry: parsed.subscriptionExpiry 
          ? new Date(parsed.subscriptionExpiry) 
          : undefined,
      };
    } catch (error) {
      console.error('Error deserializing user from storage:', error);
      throw new Error('Failed to deserialize user data');
    }
  }

  /**
   * Validate user object integrity
   */
  static validateUser(user: Partial<User>): boolean {
    try {
      // Required fields validation
      if (!user.user_id || !user.email || !user.subscription) {
        return false;
      }

      // Email format validation (basic)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(user.email)) {
        return false;
      }

      // Subscription validation
      if (!['free', 'premium'].includes(user.subscription)) {
        return false;
      }

      // Favorite carparks validation
      if (user.favoriteCarparks && !Array.isArray(user.favoriteCarparks)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('User validation error:', error);
      return false;
    }
  }

  /**
   * Sanitize user data for client-side use (remove sensitive info)
   */
  static sanitizeUserData(user: User): User {
    // For now, we don't have sensitive data to remove
    // But this method provides a place to add sanitization logic
    return {
      ...user,
    };
  }

  /**
   * Check if user subscription is active
   */
  static isSubscriptionActive(user: User): boolean {
    if (user.subscription === 'free') {
      return true; // Free subscription is always active
    }

    if (user.subscription === 'premium') {
      if (!user.subscriptionExpiry) {
        return false; // Premium without expiry date is inactive
      }
      return new Date() < user.subscriptionExpiry;
    }

    return false;
  }

  /**
   * Get user display name
   */
  static getUserDisplayName(user: User): string {
    if (user.name && user.name.trim()) {
      return user.name.trim();
    }
    
    // Extract name from email if no name provided
    if (user.email) {
      const emailPart = user.email.split('@')[0];
      return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
    }
    
    return 'User';
  }
}
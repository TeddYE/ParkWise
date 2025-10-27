import { User, LoginApiResponse, SignupApiResponse } from '@/types';

/**
 * Authentication data transformation utilities
 */
export class AuthTransformer {
  /**
   * Transform login API response to User object
   */
  static transformLoginResponse(apiData: LoginApiResponse, email: string): User {
    try {
      // Parse favorite carparks from JSON string
      let favoriteCarparks: string[] = [];
      if (apiData.fav_carparks) {
        try {
          favoriteCarparks = JSON.parse(apiData.fav_carparks);
          if (!Array.isArray(favoriteCarparks)) {
            favoriteCarparks = [];
          }
        } catch (error) {
          console.warn('Failed to parse favorite carparks:', error);
          favoriteCarparks = [];
        }
      }

      // Parse subscription end date
      let subscriptionExpiry: Date | undefined;
      if (apiData.subscription_end_date) {
        try {
          subscriptionExpiry = new Date(apiData.subscription_end_date);
          // Validate the date
          if (isNaN(subscriptionExpiry.getTime())) {
            subscriptionExpiry = undefined;
          }
        } catch (error) {
          console.warn('Failed to parse subscription end date:', error);
          subscriptionExpiry = undefined;
        }
      }

      // Determine subscription status
      const subscription = this.determineSubscriptionStatus(
        apiData.is_premium,
        subscriptionExpiry
      );

      return {
        user_id: apiData.user_id,
        email: email,
        subscription,
        subscriptionExpiry,
        favoriteCarparks,
      };
    } catch (error) {
      console.error('Error transforming login response:', error);
      throw new Error('Failed to transform login response');
    }
  }

  /**
   * Transform signup API response to User object
   */
  static transformSignupResponse(apiData: SignupApiResponse, email: string): User {
    try {
      // Parse favorite carparks from JSON string
      let favoriteCarparks: string[] = [];
      if (apiData.fav_carparks) {
        try {
          favoriteCarparks = JSON.parse(apiData.fav_carparks);
          if (!Array.isArray(favoriteCarparks)) {
            favoriteCarparks = [];
          }
        } catch (error) {
          console.warn('Failed to parse favorite carparks:', error);
          favoriteCarparks = [];
        }
      }

      // Parse subscription end date
      let subscriptionExpiry: Date | undefined;
      if (apiData.subscription_end_date) {
        try {
          subscriptionExpiry = new Date(apiData.subscription_end_date);
          // Validate the date
          if (isNaN(subscriptionExpiry.getTime())) {
            subscriptionExpiry = undefined;
          }
        } catch (error) {
          console.warn('Failed to parse subscription end date:', error);
          subscriptionExpiry = undefined;
        }
      }

      // Determine subscription status
      const subscription = this.determineSubscriptionStatus(
        apiData.is_premium || 'no',
        subscriptionExpiry
      );

      return {
        user_id: apiData.user_id,
        email: email,
        subscription,
        subscriptionExpiry,
        favoriteCarparks,
      };
    } catch (error) {
      console.error('Error transforming signup response:', error);
      throw new Error('Failed to transform signup response');
    }
  }

  /**
   * Determine subscription status from API data
   */
  private static determineSubscriptionStatus(
    isPremium: string,
    subscriptionExpiry?: Date
  ): 'free' | 'premium' {
    // Check if premium flag is set
    if (isPremium !== 'yes') {
      return 'free';
    }

    // If premium flag is set, check expiry date
    if (!subscriptionExpiry) {
      return 'premium'; // No expiry date means permanent premium
    }

    // Check if subscription is still active
    const now = new Date();
    if (subscriptionExpiry > now) {
      return 'premium';
    }

    return 'free'; // Subscription expired
  }

  /**
   * Validate user data integrity
   */
  static validateUser(user: User): boolean {
    try {
      // Required fields validation
      if (!user.user_id || typeof user.user_id !== 'string') {
        return false;
      }

      if (!user.email || typeof user.email !== 'string') {
        return false;
      }

      if (!user.subscription || !['free', 'premium'].includes(user.subscription)) {
        return false;
      }

      // Optional fields validation
      if (user.favoriteCarparks && !Array.isArray(user.favoriteCarparks)) {
        return false;
      }

      if (user.subscriptionExpiry && !(user.subscriptionExpiry instanceof Date)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user's subscription is still active
   */
  static isSubscriptionActive(user: User): boolean {
    if (user.subscription !== 'premium') {
      return true; // Free users are always "active"
    }

    if (!user.subscriptionExpiry) {
      return true; // No expiry date means permanent premium
    }

    const now = new Date();
    return user.subscriptionExpiry > now;
  }

  /**
   * Get user display name
   */
  static getUserDisplayName(user: User): string {
    if (user.name) {
      return user.name;
    }

    if (user.email) {
      // Extract name from email (before @)
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }

    return 'User';
  }

  /**
   * Serialize user for localStorage storage
   */
  static serializeUserForStorage(user: User): string {
    try {
      const storageData = {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        subscription: user.subscription,
        subscriptionExpiry: user.subscriptionExpiry?.toISOString(),
        favoriteCarparks: user.favoriteCarparks || [],
      };

      return JSON.stringify(storageData);
    } catch (error) {
      throw new Error('Failed to serialize user data');
    }
  }

  /**
   * Deserialize user from localStorage
   */
  static deserializeUserFromStorage(storedData: string): User {
    try {
      const parsed = JSON.parse(storedData);

      const user: User = {
        user_id: parsed.user_id,
        email: parsed.email,
        name: parsed.name,
        subscription: parsed.subscription,
        favoriteCarparks: parsed.favoriteCarparks || [],
      };

      // Parse subscription expiry if present
      if (parsed.subscriptionExpiry) {
        user.subscriptionExpiry = new Date(parsed.subscriptionExpiry);
      }

      return user;
    } catch (error) {
      throw new Error('Failed to deserialize user data');
    }
  }

  /**
   * Transform user data for API requests (if needed)
   */
  static transformUserForApi(user: User): any {
    return {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      is_premium: user.subscription === 'premium' ? 'yes' : 'no',
      subscription_end_date: user.subscriptionExpiry?.toISOString(),
      fav_carparks: JSON.stringify(user.favoriteCarparks || []),
    };
  }

  /**
   * Update user's favorite carparks
   */
  static updateFavoriteCarparks(user: User, carparkIds: string[]): User {
    return {
      ...user,
      favoriteCarparks: [...carparkIds],
    };
  }

  /**
   * Add carpark to user's favorites
   */
  static addFavoriteCarpark(user: User, carparkId: string): User {
    const currentFavorites = user.favoriteCarparks || [];

    if (currentFavorites.includes(carparkId)) {
      return user; // Already in favorites
    }

    return {
      ...user,
      favoriteCarparks: [...currentFavorites, carparkId],
    };
  }

  /**
   * Remove carpark from user's favorites
   */
  static removeFavoriteCarpark(user: User, carparkId: string): User {
    const currentFavorites = user.favoriteCarparks || [];

    return {
      ...user,
      favoriteCarparks: currentFavorites.filter(id => id !== carparkId),
    };
  }

  /**
   * Check if carpark is in user's favorites
   */
  static isFavoriteCarpark(user: User, carparkId: string): boolean {
    return (user.favoriteCarparks || []).includes(carparkId);
  }

  /**
   * Calculate subscription end date based on plan and current status
   */
  static calculateSubscriptionEndDate(user: User, plan: 'monthly' | 'annual'): Date {
    const now = new Date();
    let startDate: Date;

    // If user is already premium and has an active subscription, extend from current end date
    if (user.subscription === 'premium' && user.subscriptionExpiry && this.isSubscriptionActive(user)) {
      startDate = user.subscriptionExpiry;
    } else {
      // If user is free or subscription expired, start from today
      startDate = now;
    }

    const endDate = new Date(startDate);

    if (plan === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return endDate;
  }

  /**
   * Create subscription request payload
   */
  static createSubscriptionRequest(user: User, plan: 'monthly' | 'annual'): { user_id: string; subscription_end_date: string } {
    const endDate = this.calculateSubscriptionEndDate(user, plan);

    return {
      user_id: user.user_id,
      subscription_end_date: endDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    };
  }

  /**
   * Transform subscription response to updated user
   */
  static transformSubscriptionResponse(user: User, subscriptionResponse: any): User {
    try {
      let subscriptionExpiry: Date | undefined;

      if (subscriptionResponse.subscription_end_date) {
        subscriptionExpiry = new Date(subscriptionResponse.subscription_end_date);

        // Validate the date
        if (isNaN(subscriptionExpiry.getTime())) {
          throw new Error('Invalid subscription end date received');
        }
      }

      return {
        ...user,
        subscription: 'premium',
        subscriptionExpiry,
      };
    } catch (error) {
      console.error('Error transforming subscription response:', error);
      throw new Error('Failed to transform subscription response');
    }
  }

  /**
   * Get subscription status info for display
   */
  static getSubscriptionInfo(user: User): {
    status: 'free' | 'premium' | 'expired';
    daysRemaining?: number;
    expiryDate?: Date;
    isActive: boolean;
  } {
    if (user.subscription !== 'premium') {
      return {
        status: 'free',
        isActive: false,
      };
    }

    if (!user.subscriptionExpiry) {
      return {
        status: 'premium',
        isActive: true,
      };
    }

    const now = new Date();
    const isActive = user.subscriptionExpiry > now;

    if (!isActive) {
      return {
        status: 'expired',
        expiryDate: user.subscriptionExpiry,
        isActive: false,
      };
    }

    // Calculate days remaining
    const timeDiff = user.subscriptionExpiry.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return {
      status: 'premium',
      daysRemaining,
      expiryDate: user.subscriptionExpiry,
      isActive: true,
    };
  }

  /**
   * Check if user can access premium features
   */
  static canAccessPremiumFeatures(user: User): boolean {
    return user.subscription === 'premium' && this.isSubscriptionActive(user);
  }
}
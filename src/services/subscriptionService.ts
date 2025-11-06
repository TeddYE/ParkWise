import { User, SubscriptionResponse, SubscriptionPlan } from '@/types';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { AuthTransformer } from './transformers';

/**
 * Subscription management service
 */
export class SubscriptionService {
  /**
   * Subscribe user to premium plan
   */
  static async subscribe(user: User, plan: SubscriptionPlan): Promise<{ user?: User; error?: string }> {
    try {
      console.log(`Subscribing user ${user.user_id} to ${plan} plan...`);

      // Create subscription request payload
      const subscriptionRequest = AuthTransformer.createSubscriptionRequest(user, plan);

      console.log('Subscription request:', subscriptionRequest);

      const response = await apiClient.put<SubscriptionResponse>(
        API_ENDPOINTS.SUBSCRIBE,
        subscriptionRequest,
        {
          timeout: 10000,
          retries: 2,
          headers: {
            'Accept': '*/*',
          },
        }
      );

      if (!response.success) {
        return {
          error: this.getSubscriptionErrorMessage(response.error),
        };
      }

      // Check for API-level errors in response data
      if (response.data.error) {
        return {
          error: this.getSubscriptionErrorMessage(response.data.error),
        };
      }

      // Transform response to updated user object
      const updatedUser = AuthTransformer.transformSubscriptionResponse(user, response.data);

      console.log('Subscription successful:', {
        userId: updatedUser.user_id,
        subscription: updatedUser.subscription,
        expiryDate: updatedUser.subscriptionExpiry,
      });

      return { user: updatedUser };

    } catch (error) {
      console.error('Subscription error:', error);
      return {
        error: this.getSubscriptionErrorMessage(error),
      };
    }
  }

  /**
   * Get subscription pricing information
   */
  static getSubscriptionPricing(): {
    monthly: { price: number; savings: number };
    annual: { price: number; savings: number };
  } {
    return {
      monthly: {
        price: 9.99,
        savings: 0,
      },
      annual: {
        price: 99.99,
        savings: 19.89, // 2 months free
      },
    };
  }

  /**
   * Calculate subscription benefits
   */
  static getSubscriptionBenefits(): string[] {
    return [
      'Unlimited parking searches',
      'Real-time availability updates',
      'Advanced filtering options',
      'Favorite carparks management',
      'Driving time estimates',
      'Priority customer support',
      'No advertisements',
    ];
  }

  /**
   * Get subscription status for user
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
   * Check if user can access premium feature
   */
  static canAccessFeature(user: User, feature: string): boolean {
    // Define premium features
    const premiumFeatures = [
      'advanced_search',
      'real_time_updates',
      'driving_estimates',
      'unlimited_searches',
      'priority_support',
    ];

    if (!premiumFeatures.includes(feature)) {
      return true; // Free feature
    }

    return AuthTransformer.canAccessPremiumFeatures(user);
  }

  /**
   * Get feature access message for UI
   */
  static getFeatureAccessMessage(user: User, feature: string): string | null {
    if (this.canAccessFeature(user, feature)) {
      return null; // User has access
    }

    const subscriptionInfo = AuthTransformer.getSubscriptionInfo(user);

    if (subscriptionInfo.status === 'expired') {
      return 'Your premium subscription has expired. Renew to access this feature.';
    }

    return 'This is a premium feature. Upgrade to access advanced functionality.';
  }

  /**
   * Preview subscription end date for plan
   */
  static previewSubscriptionEndDate(user: User, plan: SubscriptionPlan): Date {
    return AuthTransformer.calculateSubscriptionEndDate(user, plan);
  }

  /**
   * Get user-friendly subscription error message
   */
  private static getSubscriptionErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      if (error.includes('payment') || error.includes('card')) {
        return 'Payment failed. Please check your payment method and try again.';
      }
      if (error.includes('network') || error.includes('timeout')) {
        return 'Network error. Please check your connection and try again.';
      }
      if (error.includes('already') || error.includes('active')) {
        return 'You already have an active subscription.';
      }
    }

    return 'Subscription failed. Please try again or contact support.';
  }

  /**
   * Format subscription end date for display
   */
  static formatSubscriptionDate(date: Date): string {
    return date.toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Get subscription renewal reminder message
   */
  static getRenewalReminderMessage(user: User): string | null {
    const subscriptionInfo = AuthTransformer.getSubscriptionInfo(user);

    if (!subscriptionInfo.isActive || !subscriptionInfo.daysRemaining) {
      return null;
    }

    if (subscriptionInfo.daysRemaining <= 3) {
      return `Your premium subscription expires in ${subscriptionInfo.daysRemaining} day(s). Renew now to continue enjoying premium features.`;
    }

    if (subscriptionInfo.daysRemaining <= 7) {
      return `Your premium subscription expires in ${subscriptionInfo.daysRemaining} days. Consider renewing soon.`;
    }

    return null;
  }
}

// Export individual functions for convenience
export const subscribe = SubscriptionService.subscribe.bind(SubscriptionService);
export const getSubscriptionStatus = SubscriptionService.getSubscriptionStatus.bind(SubscriptionService);
export const canAccessFeature = SubscriptionService.canAccessFeature.bind(SubscriptionService);
import { User, FavoritesRequest, FavoritesResponse } from '@/types';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

/**
 * Favorites management service
 */
export class FavoritesService {
  /**
   * Update user's favorite carparks
   */
  static async updateFavorites(user: User, favoriteCarparks: string[]): Promise<{ user?: User; error?: string }> {
    try {
      console.log(`Updating favorites for user ${user.user_id}...`);

      // Create favorites request payload
      const favoritesRequest: FavoritesRequest = {
        user_id: user.user_id,
        fav_carparks: favoriteCarparks,
      };
      
      console.log('Favorites request:', favoritesRequest);

      const response = await apiClient.put<FavoritesResponse>(
        API_ENDPOINTS.UPDATE_FAVORITES,
        favoritesRequest,
        {
          timeout: 10000,
          retries: 2,
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*',
          },
        }
      );

      if (!response.success) {
        return {
          error: this.getFavoritesErrorMessage(response.error),
        };
      }

      // Check for API-level errors in response data
      if (response.data.error) {
        return {
          error: this.getFavoritesErrorMessage(response.data.error),
        };
      }

      // Log the raw response for debugging
      console.log('Raw favorites API response:', {
        fullResponse: response.data,
        updated: response.data.updated,
      });

      // Check if the update was successful
      if (!response.data.updated) {
        console.error('API indicated update failed:', response.data);
        return {
          error: 'Failed to update favorites. Please try again.',
        };
      }

      // Since API only returns {"updated": true}, create updated user with the favorites we sent
      const updatedUser = {
        ...user,
        favoriteCarparks: favoriteCarparks,
      };
      
      console.log('Favorites update successful:', {
        userId: updatedUser.user_id,
        favoriteCount: updatedUser.favoriteCarparks?.length || 0,
        favorites: updatedUser.favoriteCarparks,
      });

      return { user: updatedUser };

    } catch (error) {
      console.error('Favorites update error:', error);
      return {
        error: this.getFavoritesErrorMessage(error),
      };
    }
  }

  /**
   * Add carpark to user's favorites
   */
  static async addFavorite(user: User, carparkId: string): Promise<{ user?: User; error?: string }> {
    const currentFavorites = user.favoriteCarparks || [];
    
    // Check if already in favorites
    if (currentFavorites.includes(carparkId)) {
      return { user }; // Already in favorites, no change needed
    }

    const newFavorites = [...currentFavorites, carparkId];
    return this.updateFavorites(user, newFavorites);
  }

  /**
   * Remove carpark from user's favorites
   */
  static async removeFavorite(user: User, carparkId: string): Promise<{ user?: User; error?: string }> {
    const currentFavorites = user.favoriteCarparks || [];
    
    // Check if not in favorites
    if (!currentFavorites.includes(carparkId)) {
      return { user }; // Not in favorites, no change needed
    }

    const newFavorites = currentFavorites.filter(id => id !== carparkId);
    return this.updateFavorites(user, newFavorites);
  }

  /**
   * Toggle carpark favorite status
   */
  static async toggleFavorite(user: User, carparkId: string): Promise<{ user?: User; error?: string; action?: 'added' | 'removed' }> {
    const currentFavorites = user.favoriteCarparks || [];
    
    if (currentFavorites.includes(carparkId)) {
      const result = await this.removeFavorite(user, carparkId);
      return { ...result, action: 'removed' };
    } else {
      const result = await this.addFavorite(user, carparkId);
      return { ...result, action: 'added' };
    }
  }

  /**
   * Clear all favorites
   */
  static async clearAllFavorites(user: User): Promise<{ user?: User; error?: string }> {
    return this.updateFavorites(user, []);
  }

  /**
   * Reorder favorites
   */
  static async reorderFavorites(user: User, reorderedFavorites: string[]): Promise<{ user?: User; error?: string }> {
    // Validate that all IDs in reorderedFavorites are currently in user's favorites
    const currentFavorites = user.favoriteCarparks || [];
    const isValidReorder = reorderedFavorites.every(id => currentFavorites.includes(id)) &&
                          reorderedFavorites.length === currentFavorites.length;

    if (!isValidReorder) {
      return {
        error: 'Invalid reorder: favorites list mismatch',
      };
    }

    return this.updateFavorites(user, reorderedFavorites);
  }

  /**
   * Get favorites statistics
   */
  static getFavoritesStats(user: User): {
    count: number;
    maxAllowed: number;
    canAddMore: boolean;
    isEmpty: boolean;
  } {
    const favorites = user.favoriteCarparks || [];
    const maxAllowed = user.subscription === 'premium' ? 50 : 10; // Premium users get more favorites

    return {
      count: favorites.length,
      maxAllowed,
      canAddMore: favorites.length < maxAllowed,
      isEmpty: favorites.length === 0,
    };
  }

  /**
   * Check if user can add more favorites
   */
  static canAddFavorite(user: User): boolean {
    const stats = this.getFavoritesStats(user);
    return stats.canAddMore;
  }

  /**
   * Get favorites limit message for UI
   */
  static getFavoritesLimitMessage(user: User): string | null {
    const stats = this.getFavoritesStats(user);
    
    if (stats.canAddMore) {
      return null; // No limit reached
    }

    if (user.subscription === 'free') {
      return `You've reached the limit of ${stats.maxAllowed} favorite carparks. Upgrade to Premium for more favorites.`;
    }

    return `You've reached the maximum of ${stats.maxAllowed} favorite carparks.`;
  }

  /**
   * Validate favorite carpark ID
   */
  static isValidCarparkId(carparkId: string): boolean {
    // Basic validation - adjust based on your carpark ID format
    return typeof carparkId === 'string' && 
           carparkId.length > 0 && 
           carparkId.length <= 10 && // Reasonable max length
           /^[A-Z0-9]+$/.test(carparkId); // Alphanumeric uppercase
  }

  /**
   * Get user-friendly favorites error message
   */
  private static getFavoritesErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      if (error.includes('limit') || error.includes('maximum')) {
        return 'You have reached the maximum number of favorite carparks.';
      }
      if (error.includes('network') || error.includes('timeout')) {
        return 'Network error. Please check your connection and try again.';
      }
      if (error.includes('invalid') || error.includes('not found')) {
        return 'Invalid carpark. Please try again.';
      }
    }
    
    return 'Failed to update favorites. Please try again.';
  }

  /**
   * Create favorites backup for recovery
   */
  static createFavoritesBackup(user: User): string[] {
    return [...(user.favoriteCarparks || [])];
  }

  /**
   * Restore favorites from backup
   */
  static async restoreFavoritesFromBackup(user: User, backup: string[]): Promise<{ user?: User; error?: string }> {
    return this.updateFavorites(user, backup);
  }
}

// Export individual functions for convenience
export const updateFavorites = FavoritesService.updateFavorites.bind(FavoritesService);
export const addFavorite = FavoritesService.addFavorite.bind(FavoritesService);
export const removeFavorite = FavoritesService.removeFavorite.bind(FavoritesService);
export const toggleFavorite = FavoritesService.toggleFavorite.bind(FavoritesService);
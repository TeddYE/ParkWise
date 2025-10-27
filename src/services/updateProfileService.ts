import { User } from "../types";

const PROFILE_API =
  "https://mb036g8g79.execute-api.ap-southeast-1.amazonaws.com/dev/update";

export interface UpdateSubscriptionRequest {
  user_id: string;
  subscription_end_date: Date;
}

export interface UpdateSubscriptionResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface UpdateFavoriteCarparksRequest {
  user_id: string;
  fav_carparks: string[];
}

export interface UpdateFavoriteCarparksResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export async function updateSubscription(
  subscriptionData: UpdateSubscriptionRequest,
): Promise<UpdateSubscriptionResponse> {
  try {
    const response = await fetch(
      PROFILE_API,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "*",
        },
        body: JSON.stringify(subscriptionData),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          errorData.error ||
          "Failed to subscribe to premium services.",
      };
    }

    const data = await response.json();

    if (!data.updated) {
      return {
        success: false,
        error: "Failed to subscribe to premium services.",
      };
    }

    const updatedUser: User = {
      user_id: subscriptionData.user_id,
      subscription: "premium",
      subscriptionExpiry: new Date(
        subscriptionData.subscription_end_date,
      ),
      favoriteCarparks: data.fav_carparks || [],
    };

    return {
      success: true,
      user: updatedUser,
    };
  } catch (error) {
    console.error("Subscription update error:", error);
    return {
      success: false,
      error: "Update failed. Please try again.",
    };
  }
}

export async function updateFavoriteCarparks(
  favoriteData: UpdateFavoriteCarparksRequest,
): Promise<UpdateFavoriteCarparksResponse> {
  try {
    const response = await fetch(PROFILE_API, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "*",
      },
      body: JSON.stringify(favoriteData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 404) {
        return {
          success: false,
          error: "User not found.",
        };
      }

      return {
        success: false,
        error:
          errorData.error ||
          "Failed to update favorite carparks.",
      };
    }

    const data = await response.json();

    const updatedUser: User = {
      user_id: favoriteData.user_id,
      subscription: data.subscription || "free",
      subscriptionExpiry: data.subscription_end_date
        ? new Date(data.subscription_end_date)
        : undefined,
      favoriteCarparks: favoriteData.fav_carparks,
    };

    return {
      success: true,
      user: updatedUser,
    };
  } catch (error) {
    console.error("Favorite carparks update error:", error);
    return {
      success: false,
      error: "Update failed. Please try again.",
    };
  }
}

export function isSubscriptionActive(
  user: User | null,
): boolean {
  if (!user || user.subscription !== "premium") {
    return false;
  }

  if (!user.subscriptionExpiry) {
    return false;
  }

  const expiryDate = new Date(user.subscriptionExpiry);
  const now = new Date();

  return expiryDate > now;
}

export function getSubscriptionDaysRemaining(
  user: User | null,
): number {
  if (!user || !user.subscriptionExpiry) {
    return 0;
  }

  const expiryDate = new Date(user.subscriptionExpiry);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}
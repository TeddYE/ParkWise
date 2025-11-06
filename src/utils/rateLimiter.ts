/**
 * Simple client-side rate limiter to prevent API abuse
 */

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig = { maxRequests: 60, windowMs: 60000 }) {
        this.config = config;
    }

    /**
     * Check if request is allowed
     */
    isAllowed(key: string): boolean {
        const now = Date.now();
        const requests = this.requests.get(key) || [];

        // Remove old requests outside the window
        const validRequests = requests.filter(
            timestamp => now - timestamp < this.config.windowMs
        );

        // Check if under limit
        if (validRequests.length >= this.config.maxRequests) {
            return false;
        }

        // Add current request
        validRequests.push(now);
        this.requests.set(key, validRequests);

        return true;
    }

    /**
     * Get remaining requests in current window
     */
    getRemaining(key: string): number {
        const now = Date.now();
        const requests = this.requests.get(key) || [];
        const validRequests = requests.filter(
            timestamp => now - timestamp < this.config.windowMs
        );

        return Math.max(0, this.config.maxRequests - validRequests.length);
    }

    /**
     * Reset rate limit for a key
     */
    reset(key: string): void {
        this.requests.delete(key);
    }
}

// Export singleton instances for different API types
export const carparkApiLimiter = new RateLimiter({ maxRequests: 30, windowMs: 60000 }); // 30 requests per minute
export const authApiLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 }); // 10 requests per minute
export const predictionApiLimiter = new RateLimiter({ maxRequests: 20, windowMs: 60000 }); // 20 requests per minute

export default RateLimiter;
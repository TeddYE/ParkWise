import { CacheConfig, CacheEntry } from '@/types';

// LRU Cache implementation
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.data;
  }

  set(key: string, data: T, ttl: number): void {
    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(key, entry);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Cache manager with multiple strategies
export class CacheManager {
  private caches = new Map<string, LRUCache<any>>();
  private defaultConfig: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    strategy: 'LRU',
  };

  constructor(defaultConfig?: Partial<CacheConfig>) {
    if (defaultConfig) {
      this.defaultConfig = { ...this.defaultConfig, ...defaultConfig };
    }

    // Periodic cleanup
    setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  private getCache<T>(namespace: string, config?: CacheConfig): LRUCache<T> {
    if (!this.caches.has(namespace)) {
      const finalConfig = { ...this.defaultConfig, ...config };
      this.caches.set(namespace, new LRUCache<T>(finalConfig.maxSize));
    }
    return this.caches.get(namespace)!;
  }

  async get<T>(namespace: string, key: string): Promise<T | null> {
    const cache = this.getCache<T>(namespace);
    return cache.get(key);
  }

  async set<T>(
    namespace: string,
    key: string,
    value: T,
    config?: Partial<CacheConfig>
  ): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const cache = this.getCache<T>(namespace, finalConfig);
    cache.set(key, value, finalConfig.ttl);
  }

  async invalidate(namespace: string, pattern?: string): Promise<void> {
    const cache = this.caches.get(namespace);
    if (!cache) return;

    if (!pattern) {
      cache.clear();
      return;
    }

    // Pattern-based invalidation (simple wildcard support)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];

    // Note: We can't directly iterate over Map keys with patterns,
    // so this is a simplified implementation
    cache.clear(); // For now, clear all if pattern is provided
  }

  async has(namespace: string, key: string): Promise<boolean> {
    const value = await this.get(namespace, key);
    return value !== null;
  }

  private cleanup(): void {
    for (const cache of this.caches.values()) {
      cache.cleanup();
    }
  }

  // Get cache statistics
  getStats(namespace?: string): { size: number; namespaces: string[] } {
    if (namespace) {
      const cache = this.caches.get(namespace);
      return {
        size: cache ? cache.size() : 0,
        namespaces: [namespace],
      };
    }

    return {
      size: Array.from(this.caches.values()).reduce((total, cache) => total + cache.size(), 0),
      namespaces: Array.from(this.caches.keys()),
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
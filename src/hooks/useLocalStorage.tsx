import { useState, useCallback, useEffect, useRef } from 'react';

interface UseLocalStorageOptions {
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
  syncAcrossTabs?: boolean;
}

/**
 * Enhanced localStorage hook with error handling and synchronization
 * Provides persistent state management with cache invalidation
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions = {}
) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    syncAcrossTabs = true,
  } = options;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }

      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const [error, setError] = useState<string | null>(null);
  const valueRef = useRef(storedValue);

  // Update ref when value changes
  useEffect(() => {
    valueRef.current = storedValue;
  }, [storedValue]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setError(null);
      
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(valueRef.current) : value;
      
      // Save state
      setStoredValue(valueToStore);
      valueRef.current = valueToStore;
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, serialize(valueToStore));
      }
    } catch (error) {
      const errorMessage = `Error setting localStorage key "${key}": ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      console.error(errorMessage, error);
      setError(errorMessage);
    }
  }, [key, serialize]);

  const removeValue = useCallback(() => {
    try {
      setError(null);
      setStoredValue(initialValue);
      valueRef.current = initialValue;
      
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      const errorMessage = `Error removing localStorage key "${key}": ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      console.error(errorMessage, error);
      setError(errorMessage);
    }
  }, [key, initialValue]);

  // Check if localStorage is available
  const isSupported = useCallback(() => {
    try {
      if (typeof window === 'undefined') return false;
      
      const testKey = '__localStorage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Get storage info
  const getStorageInfo = useCallback(() => {
    if (typeof window === 'undefined' || !isSupported()) {
      return { used: 0, available: 0, quota: 0 };
    }

    try {
      // Estimate storage usage
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          used += key.length + (value?.length || 0);
        }
      }

      // Most browsers have a 5-10MB limit
      const quota = 5 * 1024 * 1024; // 5MB estimate
      const available = quota - used;

      return { used, available, quota };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { used: 0, available: 0, quota: 0 };
    }
  }, [isSupported]);

  // Sync across tabs
  useEffect(() => {
    if (!syncAcrossTabs || typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = deserialize(e.newValue);
          setStoredValue(newValue);
          valueRef.current = newValue;
        } catch (error) {
          console.error(`Error syncing localStorage key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize, syncAcrossTabs]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    error,
    isSupported: isSupported(),
    getStorageInfo,
  };
}

/**
 * Hook for managing cache with TTL (Time To Live)
 */
export function useLocalStorageCache<T>(
  key: string,
  ttlMinutes: number = 60
) {
  const cacheKey = `cache_${key}`;
  
  const { value: cacheData, setValue: setCacheData, removeValue: removeCacheData } = useLocalStorage<{
    data: T;
    timestamp: number;
    ttl: number;
  } | null>(cacheKey, null);

  const isExpired = useCallback(() => {
    if (!cacheData) return true;
    
    const now = Date.now();
    const expiryTime = cacheData.timestamp + (cacheData.ttl * 60 * 1000);
    return now > expiryTime;
  }, [cacheData]);

  const getCachedValue = useCallback((): T | null => {
    if (!cacheData || isExpired()) {
      return null;
    }
    return cacheData.data;
  }, [cacheData, isExpired]);

  const setCachedValue = useCallback((data: T, customTtl?: number) => {
    const ttl = customTtl || ttlMinutes;
    setCacheData({
      data,
      timestamp: Date.now(),
      ttl,
    });
  }, [setCacheData, ttlMinutes]);

  const clearCache = useCallback(() => {
    removeCacheData();
  }, [removeCacheData]);

  const refreshCache = useCallback((data: T, customTtl?: number) => {
    setCachedValue(data, customTtl);
  }, [setCachedValue]);

  return {
    getCachedValue,
    setCachedValue,
    clearCache,
    refreshCache,
    isExpired: isExpired(),
    hasCache: cacheData !== null,
  };
}

/**
 * Hook for managing user preferences with defaults
 */
export function useUserPreferences<T extends Record<string, any>>(
  defaultPreferences: T
) {
  const { value: preferences, setValue: setPreferences, error } = useLocalStorage<T>(
    'userPreferences',
    defaultPreferences
  );

  const updatePreference = useCallback(<K extends keyof T>(
    key: K,
    value: T[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  }, [setPreferences]);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
  }, [setPreferences, defaultPreferences]);

  const getPreference = useCallback(<K extends keyof T>(key: K): T[K] => {
    return preferences[key];
  }, [preferences]);

  return {
    preferences,
    updatePreference,
    resetPreferences,
    getPreference,
    error,
  };
}
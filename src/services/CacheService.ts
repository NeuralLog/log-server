/**
 * Cache service for storing and retrieving cached data
 */
export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, { value: any; expiry: number }>;
  private defaultTTL: number;

  private constructor(defaultTTL: number = 300000) { // Default TTL: 5 minutes
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get the singleton instance of the CacheService
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Set a value in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttl Time to live in milliseconds (optional, defaults to the service default TTL)
   */
  public set(key: string, value: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value, or undefined if not found or expired
   */
  public get(key: string): any {
    const item = this.cache.get(key);
    
    // Return undefined if item doesn't exist
    if (!item) {
      return undefined;
    }
    
    // Check if the item has expired
    if (Date.now() > item.expiry) {
      this.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  /**
   * Delete a value from the cache
   * @param key The cache key
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all values from the cache
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get a value from the cache, or compute and cache it if not found
   * @param key The cache key
   * @param factory A function that returns the value to cache
   * @param ttl Time to live in milliseconds (optional)
   * @returns The cached or computed value
   */
  public async getOrCompute<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cachedValue = this.get(key);
    if (cachedValue !== undefined) {
      return cachedValue as T;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Cleanup expired cache entries
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start automatic cleanup at regular intervals
   * @param interval Cleanup interval in milliseconds (default: 60000 ms = 1 minute)
   * @returns A function to stop the automatic cleanup
   */
  public startAutoCleanup(interval: number = 60000): () => void {
    const timer = setInterval(() => this.cleanup(), interval);
    return () => clearInterval(timer);
  }
}

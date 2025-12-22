/**
 * Simple in-memory cache utility for API responses
 *
 * Cache entries have a TTL (Time To Live) of 5 minutes by default.
 * Cache keys are composite strings in the format:
 * ${provider}_${workspace}_${project}_${dateRange}
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Default TTL: 5 minutes (in milliseconds)
const DEFAULT_TTL = 5 * 60 * 1000;

// In-memory cache storage
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Generate a cache key from query parameters
 *
 * @param provider - Provider ID (e.g., 'openai', 'anthropic')
 * @param workspace - Optional workspace ID
 * @param projectId - Project ID
 * @param startDate - Start date (ISO format)
 * @param endDate - End date (ISO format)
 * @returns Composite cache key string
 */
export function generateCacheKey(
  provider: string,
  workspace: string | undefined,
  projectId: string,
  startDate: string,
  endDate: string
): string {
  const workspaceKey = workspace || 'none';
  const dateRange = `${startDate}_${endDate}`;
  return `${provider}_${workspaceKey}_${projectId}_${dateRange}`;
}

/**
 * Get data from cache if it exists and hasn't expired
 *
 * @param key - Cache key
 * @param ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns Cached data or null if not found or expired
 */
export function getFromCache<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (!entry) {
    return null;
  }

  const now = Date.now();
  const age = now - entry.timestamp;

  // Check if cache entry has expired
  if (age > ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Store data in cache with current timestamp
 *
 * @param key - Cache key
 * @param data - Data to cache
 */
export function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Manually invalidate a specific cache entry
 *
 * @param key - Cache key to invalidate
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Get the timestamp of a cache entry (for displaying "last updated")
 *
 * @param key - Cache key
 * @returns ISO timestamp string or null if not found
 */
export function getCacheTimestamp(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  return new Date(entry.timestamp).toISOString();
}

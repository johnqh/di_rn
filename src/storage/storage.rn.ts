import type {
  PlatformStorage,
  AdvancedPlatformStorage,
} from '@sudobility/di/interfaces';
import type { Optional } from '@sudobility/types';

/**
 * Type definition for the AsyncStorage static interface.
 * Matches the public API of `@react-native-async-storage/async-storage`.
 */
interface AsyncStorageStatic {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: string[]): Promise<void>;
}

// Lazy load AsyncStorage to avoid crashes if native module is not linked
let AsyncStorageModule: AsyncStorageStatic | null = null;

/**
 * Inject a mock or custom AsyncStorage module for testing.
 *
 * @param storage - The AsyncStorage implementation to use, or `null` to reset.
 *
 * @example
 * ```ts
 * // In tests:
 * setAsyncStorageModule(mockAsyncStorage);
 * const storage = new RNStorage();
 * await storage.setItem('key', 'value');
 * ```
 */
export function setAsyncStorageModule(
  storage: AsyncStorageStatic | null
): void {
  AsyncStorageModule = storage;
}

/**
 * Lazily load and return the AsyncStorage native module.
 *
 * Uses `require()` inside a try-catch to avoid crashes when the native module
 * is not linked. The module is cached after the first successful load.
 *
 * @returns The AsyncStorage module, or `null` if not available.
 *
 * @example
 * ```ts
 * const storage = getAsyncStorage();
 * if (storage) {
 *   await storage.setItem('key', 'value');
 * }
 * ```
 */
function getAsyncStorage(): AsyncStorageStatic | null {
  if (!AsyncStorageModule) {
    try {
      const mod: Record<
        string,
        unknown
      > = require('@react-native-async-storage/async-storage');
      AsyncStorageModule = (mod.default ?? mod) as AsyncStorageStatic;
    } catch (e) {
      console.warn('AsyncStorage not available:', e);
    }
  }
  return AsyncStorageModule;
}

/**
 * React Native storage implementation using AsyncStorage.
 * All operations are async (returns Promises).
 *
 * Implements `PlatformStorage` from `@sudobility/di/interfaces`.
 * Uses lazy native module loading -- AsyncStorage is loaded on first use
 * via `require()` in a try-catch to prevent crashes when not linked.
 *
 * @example
 * ```ts
 * const storage = new RNStorage();
 * await storage.setItem('user', 'Alice');
 * const user = await storage.getItem('user'); // 'Alice'
 * ```
 */
export class RNStorage implements PlatformStorage {
  /**
   * Store a key-value pair in AsyncStorage.
   *
   * @param key - The storage key.
   * @param value - The string value to store.
   * @throws Error if AsyncStorage is not available.
   *
   * @example
   * ```ts
   * await storage.setItem('theme', 'dark');
   * ```
   */
  async setItem(key: string, value: string): Promise<void> {
    const storage = getAsyncStorage();
    if (!storage) throw new Error('AsyncStorage not available');
    await storage.setItem(key, value);
  }

  /**
   * Retrieve a value from AsyncStorage by key.
   *
   * @param key - The storage key.
   * @returns The stored value, or `null` if the key does not exist or AsyncStorage is unavailable.
   *
   * @example
   * ```ts
   * const theme = await storage.getItem('theme'); // 'dark' or null
   * ```
   */
  async getItem(key: string): Promise<Optional<string>> {
    const storage = getAsyncStorage();
    if (!storage) return null;
    const value = await storage.getItem(key);
    return value ?? null;
  }

  /**
   * Remove a key-value pair from AsyncStorage.
   *
   * @param key - The storage key to remove.
   *
   * @example
   * ```ts
   * await storage.removeItem('theme');
   * ```
   */
  async removeItem(key: string): Promise<void> {
    const storage = getAsyncStorage();
    if (!storage) return;
    await storage.removeItem(key);
  }

  /**
   * Clear all data from AsyncStorage.
   *
   * @example
   * ```ts
   * await storage.clear();
   * ```
   */
  async clear(): Promise<void> {
    const storage = getAsyncStorage();
    if (!storage) return;
    await storage.clear();
  }

  /**
   * Get all keys currently stored in AsyncStorage.
   *
   * @returns An array of all storage keys, or an empty array if unavailable.
   *
   * @example
   * ```ts
   * const keys = await storage.getAllKeys(); // ['theme', 'user']
   * ```
   */
  async getAllKeys(): Promise<string[]> {
    const storage = getAsyncStorage();
    if (!storage) return [];
    const keys = await storage.getAllKeys();
    return [...keys];
  }

  /**
   * Dispose of the storage instance and reset the cached native module.
   *
   * After calling dispose, subsequent operations will attempt to re-load
   * the native module on next use.
   */
  dispose(): void {
    // No native listeners to clean up, but reset the cached module
    // so it can be re-initialized if needed.
    AsyncStorageModule = null;
  }
}

/**
 * Storage wrapper that includes value metadata (timestamp, TTL).
 */
interface StoredValue {
  value: string;
  timestamp: number;
  ttl?: number | undefined;
}

/**
 * Advanced React Native storage with TTL support and pattern matching.
 *
 * Wraps `RNStorage` and adds time-to-live (TTL) expiration and regex
 * pattern-based key clearing. Implements `AdvancedPlatformStorage` from
 * `@sudobility/di/interfaces`.
 *
 * @example
 * ```ts
 * const advStorage = new AdvancedRNStorage();
 * await advStorage.setItem('cache:data', 'value', 60000); // 60s TTL
 * const data = await advStorage.getItem('cache:data'); // null after 60s
 * await advStorage.clearPattern('^cache:'); // remove all cache keys
 * ```
 */
export class AdvancedRNStorage implements AdvancedPlatformStorage {
  private storage: RNStorage;

  constructor() {
    this.storage = new RNStorage();
  }

  /**
   * Store a value with optional TTL (time-to-live).
   *
   * @param key - The storage key.
   * @param value - The string value to store.
   * @param ttl - Optional TTL in milliseconds. If not provided, the value never expires.
   * @throws Error if AsyncStorage is not available.
   *
   * @example
   * ```ts
   * await advStorage.setItem('token', 'abc123', 3600000); // 1 hour TTL
   * ```
   */
  async setItem(
    key: string,
    value: string,
    ttl?: Optional<number>
  ): Promise<void> {
    const storedValue: StoredValue = {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? undefined,
    };
    await this.storage.setItem(key, JSON.stringify(storedValue));
  }

  /**
   * Retrieve a value, returning `null` if it has expired or does not exist.
   *
   * @param key - The storage key.
   * @returns The stored value, or `null` if missing or expired.
   *
   * @example
   * ```ts
   * const token = await advStorage.getItem('token'); // null if expired
   * ```
   */
  async getItem(key: string): Promise<Optional<string>> {
    const raw = await this.storage.getItem(key);
    if (!raw) return null;

    try {
      const stored = JSON.parse(raw) as StoredValue;

      // Check TTL expiration
      if (stored.ttl !== undefined) {
        const elapsed = Date.now() - stored.timestamp;
        if (elapsed > stored.ttl) {
          await this.removeItem(key);
          return null;
        }
      }

      return stored.value;
    } catch {
      // If parsing fails, return raw value (backward compatibility)
      return raw;
    }
  }

  /**
   * Remove a key-value pair.
   *
   * @param key - The storage key to remove.
   */
  async removeItem(key: string): Promise<void> {
    await this.storage.removeItem(key);
  }

  /**
   * Clear all stored data.
   */
  async clear(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * Get all keys currently stored.
   *
   * @returns An array of all storage keys.
   */
  async getAllKeys(): Promise<string[]> {
    return this.storage.getAllKeys();
  }

  /**
   * Check if a key exists and has not expired.
   *
   * @param key - The storage key.
   * @returns `true` if the key exists and its value has not expired.
   *
   * @example
   * ```ts
   * if (await advStorage.hasItem('token')) {
   *   // token is still valid
   * }
   * ```
   */
  async hasItem(key: string): Promise<boolean> {
    const value = await this.getItem(key);
    return value !== null;
  }

  /**
   * Clear items matching a regex pattern, or all items if no pattern given.
   *
   * @param pattern - Optional regex pattern string. If omitted, clears all data.
   *
   * @example
   * ```ts
   * await advStorage.clearPattern('^cache:'); // remove all cache:* keys
   * await advStorage.clearPattern(); // clear everything
   * ```
   */
  async clearPattern(pattern?: Optional<string>): Promise<void> {
    if (!pattern) {
      await this.clear();
      return;
    }

    const keys = await this.getAllKeys();
    const regex = new RegExp(pattern);
    const keysToRemove = keys.filter((key) => regex.test(key));

    if (keysToRemove.length > 0) {
      const storage = getAsyncStorage();
      if (storage) {
        await storage.multiRemove(keysToRemove);
      }
    }
  }

  /**
   * Dispose of the advanced storage instance and its underlying storage.
   *
   * Delegates to `RNStorage.dispose()` to reset the cached native module.
   */
  dispose(): void {
    this.storage.dispose();
  }
}

// Singleton instances
export const rnStorage = new RNStorage();
export const advancedRNStorage = new AdvancedRNStorage();

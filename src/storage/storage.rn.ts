import type { PlatformStorage, AdvancedPlatformStorage } from '@sudobility/di';
import type { Optional } from '@sudobility/types';

// Lazy load AsyncStorage to avoid crashes if native module is not linked
let AsyncStorageModule: typeof import('@react-native-async-storage/async-storage').default | null = null;

function getAsyncStorage() {
  if (!AsyncStorageModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@react-native-async-storage/async-storage');
      AsyncStorageModule = mod.default ?? mod;
    } catch (e) {
      console.warn('AsyncStorage not available:', e);
    }
  }
  return AsyncStorageModule;
}

/**
 * React Native storage implementation using AsyncStorage.
 * All operations are async (returns Promises).
 */
export class RNStorage implements PlatformStorage {
  async setItem(key: string, value: string): Promise<void> {
    const storage = getAsyncStorage();
    if (!storage) throw new Error('AsyncStorage not available');
    await storage.setItem(key, value);
  }

  async getItem(key: string): Promise<Optional<string>> {
    const storage = getAsyncStorage();
    if (!storage) return null;
    const value = await storage.getItem(key);
    return value ?? null;
  }

  async removeItem(key: string): Promise<void> {
    const storage = getAsyncStorage();
    if (!storage) return;
    await storage.removeItem(key);
  }

  async clear(): Promise<void> {
    const storage = getAsyncStorage();
    if (!storage) return;
    await storage.clear();
  }

  async getAllKeys(): Promise<string[]> {
    const storage = getAsyncStorage();
    if (!storage) return [];
    const keys = await storage.getAllKeys();
    return [...keys];
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
 */
export class AdvancedRNStorage implements AdvancedPlatformStorage {
  private storage: RNStorage;

  constructor() {
    this.storage = new RNStorage();
  }

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

  async removeItem(key: string): Promise<void> {
    await this.storage.removeItem(key);
  }

  async clear(): Promise<void> {
    await this.storage.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return this.storage.getAllKeys();
  }

  async hasItem(key: string): Promise<boolean> {
    const value = await this.getItem(key);
    return value !== null;
  }

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
}

// Singleton instances
export const rnStorage = new RNStorage();
export const advancedRNStorage = new AdvancedRNStorage();

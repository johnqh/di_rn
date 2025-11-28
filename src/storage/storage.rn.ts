import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlatformStorage, AdvancedPlatformStorage } from '@sudobility/di';
import type { Optional } from '@sudobility/types';

/**
 * React Native storage implementation using AsyncStorage.
 * All operations are async (returns Promises).
 */
export class RNStorage implements PlatformStorage {
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async getItem(key: string): Promise<Optional<string>> {
    const value = await AsyncStorage.getItem(key);
    return value ?? null;
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    await AsyncStorage.clear();
  }

  async getAllKeys(): Promise<string[]> {
    const keys = await AsyncStorage.getAllKeys();
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
      await AsyncStorage.multiRemove(keysToRemove);
    }
  }
}

// Singleton instances
export const rnStorage = new RNStorage();
export const advancedRNStorage = new AdvancedRNStorage();

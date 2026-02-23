import type { StorageService } from '@sudobility/di/interfaces';
import type { StorageType, Optional } from '@sudobility/types';
import { RNStorage } from './storage.rn.js';

/**
 * React Native Storage Service implementing the `StorageService` interface.
 *
 * Wraps `RNStorage` and adds `isAvailable()` and `getType()` for DI compatibility.
 *
 * @example
 * ```ts
 * const service = new RNStorageService();
 * if (service.isAvailable()) {
 *   await service.setItem('key', 'value');
 * }
 * console.log(service.getType()); // 'asyncStorage'
 * ```
 */
export class RNStorageService implements StorageService {
  private storage: RNStorage;

  constructor() {
    this.storage = new RNStorage();
  }

  /**
   * Retrieve a value by key.
   *
   * @param key - The storage key.
   * @returns The stored value, or `null` if not found.
   */
  async getItem(key: string): Promise<Optional<string>> {
    return this.storage.getItem(key);
  }

  /**
   * Store a key-value pair.
   *
   * @param key - The storage key.
   * @param value - The string value to store.
   * @throws Error if AsyncStorage is not available.
   */
  async setItem(key: string, value: string): Promise<void> {
    return this.storage.setItem(key, value);
  }

  /**
   * Remove a key-value pair.
   *
   * @param key - The storage key to remove.
   */
  async removeItem(key: string): Promise<void> {
    return this.storage.removeItem(key);
  }

  /**
   * Clear all stored data.
   */
  async clear(): Promise<void> {
    return this.storage.clear();
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
   * Check if the storage backend is available.
   *
   * @returns `true` -- AsyncStorage is always available in React Native.
   */
  isAvailable(): boolean {
    // AsyncStorage is always available in React Native
    return true;
  }

  /**
   * Get the storage type identifier.
   *
   * @returns `'asyncStorage'` as the storage type.
   */
  getType(): StorageType {
    return 'asyncStorage' as StorageType;
  }

  /**
   * Dispose of the storage service and its underlying storage.
   */
  dispose(): void {
    this.storage.dispose();
  }
}

/**
 * Serialized storage service for storing objects as JSON.
 *
 * Provides type-safe serialization/deserialization of objects to/from
 * AsyncStorage via `RNStorage`.
 *
 * @example
 * ```ts
 * const serialized = new RNSerializedStorageService();
 * await serialized.setObject('user', { name: 'Alice', age: 30 });
 * const user = await serialized.getObject<{ name: string; age: number }>('user');
 * ```
 */
export class RNSerializedStorageService {
  private storage: RNStorage;

  constructor() {
    this.storage = new RNStorage();
  }

  /**
   * Retrieve and deserialize a stored JSON object.
   *
   * @typeParam T - The expected type of the stored object.
   * @param key - The storage key.
   * @returns The deserialized object, or `null` if the key does not exist or parsing fails.
   *
   * @example
   * ```ts
   * const user = await service.getObject<{ name: string }>('user');
   * ```
   */
  async getObject<T>(key: string): Promise<Optional<T>> {
    const value = await this.storage.getItem(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Serialize and store an object as JSON.
   *
   * @typeParam T - The type of the object to store.
   * @param key - The storage key.
   * @param value - The object to serialize and store.
   * @throws Error if AsyncStorage is not available.
   *
   * @example
   * ```ts
   * await service.setObject('user', { name: 'Alice' });
   * ```
   */
  async setObject<T>(key: string, value: T): Promise<void> {
    await this.storage.setItem(key, JSON.stringify(value));
  }

  /**
   * Remove a stored object by key.
   *
   * @param key - The storage key to remove.
   */
  async removeObject(key: string): Promise<void> {
    await this.storage.removeItem(key);
  }

  /**
   * Check if an object exists in storage for the given key.
   *
   * @param key - The storage key.
   * @returns `true` if the key exists and has a value.
   */
  async hasObject(key: string): Promise<boolean> {
    const value = await this.storage.getItem(key);
    return value !== null;
  }

  /**
   * Dispose of the serialized storage service and its underlying storage.
   */
  dispose(): void {
    this.storage.dispose();
  }
}

// Singleton management
let storageService: RNStorageService | null = null;

/**
 * Get the storage service singleton, auto-creating one if not yet initialized.
 *
 * @returns The `RNStorageService` singleton instance.
 *
 * @example
 * ```ts
 * const storage = getStorageService();
 * await storage.setItem('key', 'value');
 * ```
 */
export function getStorageService(): RNStorageService {
  if (!storageService) {
    storageService = new RNStorageService();
  }
  return storageService;
}

/**
 * Initialize the storage service singleton, optionally injecting a custom instance.
 *
 * If a previous singleton exists, it is replaced (no dispose is called on the old one).
 *
 * @param service - Optional custom `RNStorageService` instance. If omitted, a new one is created.
 * @returns The initialized `RNStorageService` singleton.
 *
 * @example
 * ```ts
 * // Default initialization
 * initializeStorageService();
 *
 * // Custom injection (e.g., for testing)
 * initializeStorageService(new RNStorageService());
 * ```
 */
export function initializeStorageService(
  service?: RNStorageService
): RNStorageService {
  storageService = service ?? new RNStorageService();
  return storageService;
}

/**
 * Reset the storage service singleton to `null`.
 *
 * Disposes the current instance if one exists.
 *
 * @example
 * ```ts
 * resetStorageService();
 * ```
 */
export function resetStorageService(): void {
  if (storageService) {
    storageService.dispose();
    storageService = null;
  }
}

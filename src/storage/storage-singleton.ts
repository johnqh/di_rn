import type { StorageService } from '@sudobility/di';
import type { StorageType, Optional } from '@sudobility/types';
import { RNStorage } from './storage.rn.js';

/**
 * React Native Storage Service implementing the StorageService interface.
 */
export class RNStorageService implements StorageService {
  private storage: RNStorage;

  constructor() {
    this.storage = new RNStorage();
  }

  async getItem(key: string): Promise<Optional<string>> {
    return this.storage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    return this.storage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    return this.storage.removeItem(key);
  }

  async clear(): Promise<void> {
    return this.storage.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return this.storage.getAllKeys();
  }

  isAvailable(): boolean {
    // AsyncStorage is always available in React Native
    return true;
  }

  getType(): StorageType {
    return 'asyncStorage' as StorageType;
  }
}

/**
 * Serialized storage service for storing objects as JSON.
 */
export class RNSerializedStorageService {
  private storage: RNStorage;

  constructor() {
    this.storage = new RNStorage();
  }

  async getObject<T>(key: string): Promise<Optional<T>> {
    const value = await this.storage.getItem(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setObject<T>(key: string, value: T): Promise<void> {
    await this.storage.setItem(key, JSON.stringify(value));
  }

  async removeObject(key: string): Promise<void> {
    await this.storage.removeItem(key);
  }

  async hasObject(key: string): Promise<boolean> {
    const value = await this.storage.getItem(key);
    return value !== null;
  }
}

// Singleton management
let storageService: RNStorageService | null = null;

export function getStorageService(): RNStorageService {
  if (!storageService) {
    storageService = new RNStorageService();
  }
  return storageService;
}

export function initializeStorageService(
  service?: RNStorageService
): RNStorageService {
  storageService = service ?? new RNStorageService();
  return storageService;
}

export function resetStorageService(): void {
  storageService = null;
}

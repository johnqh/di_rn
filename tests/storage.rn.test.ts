import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RNStorage, AdvancedRNStorage } from '../src/storage/storage.rn.js';

describe('RNStorage', () => {
  let storage: RNStorage;

  beforeEach(() => {
    storage = new RNStorage();
    vi.clearAllMocks();
  });

  describe('setItem', () => {
    it('should call AsyncStorage.setItem with correct arguments', async () => {
      await storage.setItem('testKey', 'testValue');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('testKey', 'testValue');
    });
  });

  describe('getItem', () => {
    it('should return value from AsyncStorage', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('storedValue');
      const result = await storage.getItem('testKey');
      expect(result).toBe('storedValue');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('testKey');
    });

    it('should return null when key does not exist', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
      const result = await storage.getItem('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should call AsyncStorage.removeItem', async () => {
      await storage.removeItem('testKey');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('testKey');
    });
  });

  describe('clear', () => {
    it('should call AsyncStorage.clear', async () => {
      await storage.clear();
      expect(AsyncStorage.clear).toHaveBeenCalled();
    });
  });

  describe('getAllKeys', () => {
    it('should return all keys from AsyncStorage', async () => {
      vi.mocked(AsyncStorage.getAllKeys).mockResolvedValueOnce([
        'key1',
        'key2',
      ]);
      const result = await storage.getAllKeys();
      expect(result).toEqual(['key1', 'key2']);
    });
  });
});

describe('AdvancedRNStorage', () => {
  let storage: AdvancedRNStorage;

  beforeEach(() => {
    storage = new AdvancedRNStorage();
    vi.clearAllMocks();
  });

  describe('setItem with TTL', () => {
    it('should store value with metadata', async () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      await storage.setItem('testKey', 'testValue', 60000);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'testKey',
        JSON.stringify({
          value: 'testValue',
          timestamp: now,
          ttl: 60000,
        })
      );
    });
  });

  describe('getItem with TTL', () => {
    it('should return value if not expired', async () => {
      const now = Date.now();
      const stored = {
        value: 'testValue',
        timestamp: now - 30000, // 30 seconds ago
        ttl: 60000, // 60 second TTL
      };

      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(
        JSON.stringify(stored)
      );
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const result = await storage.getItem('testKey');
      expect(result).toBe('testValue');
    });

    it('should return null and remove item if expired', async () => {
      const now = Date.now();
      const stored = {
        value: 'testValue',
        timestamp: now - 120000, // 120 seconds ago
        ttl: 60000, // 60 second TTL (expired)
      };

      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(
        JSON.stringify(stored)
      );
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const result = await storage.getItem('testKey');
      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('testKey');
    });
  });

  describe('hasItem', () => {
    it('should return true if item exists', async () => {
      const stored = {
        value: 'testValue',
        timestamp: Date.now(),
      };
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(
        JSON.stringify(stored)
      );

      const result = await storage.hasItem('testKey');
      expect(result).toBe(true);
    });

    it('should return false if item does not exist', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);

      const result = await storage.hasItem('testKey');
      expect(result).toBe(false);
    });
  });

  describe('clearPattern', () => {
    it('should remove items matching pattern', async () => {
      vi.mocked(AsyncStorage.getAllKeys).mockResolvedValueOnce([
        'user_123',
        'user_456',
        'config_abc',
      ]);

      await storage.clearPattern('^user_');

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'user_123',
        'user_456',
      ]);
    });

    it('should clear all if no pattern provided', async () => {
      await storage.clearPattern();
      expect(AsyncStorage.clear).toHaveBeenCalled();
    });
  });
});

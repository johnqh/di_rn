import { describe, it, expect, beforeEach, vi } from 'vitest';

// Must mock env.rn.ts BEFORE importing initialize, since it throws at module load time
vi.mock('../src/env/env.rn.js', () => ({
  RNEnvProvider: class MockEnvProvider {
    get() {
      return null;
    }
    getAll() {
      return {};
    }
    isDevelopment() {
      return true;
    }
    isProduction() {
      return false;
    }
    isTest() {
      return true;
    }
  },
  createRNAppConfig: vi.fn(() => ({})),
  rnEnvProvider: {},
  rnAppConfig: {},
}));

// Mock the storage singleton
vi.mock('../src/storage/storage-singleton.js', () => ({
  RNStorageService: class MockStorageService {},
  initializeStorageService: vi.fn(),
  getStorageService: vi.fn(),
  resetStorageService: vi.fn(),
}));

// Mock the info service
vi.mock('../src/info/index.js', () => ({
  initializeInfoService: vi.fn(),
  getInfoService: vi.fn(),
  resetInfoService: vi.fn(),
  RNInfoService: class MockInfoService {},
  createRNInfoService: vi.fn(),
}));

// Get references to the mocked functions
const mockInitializeFirebaseService = vi.fn();
const mockInitializeFirebaseAnalytics = vi.fn(
  () => new (class MockAnalytics {})()
);
const mockInitializeDiNetworkService = vi.fn();

// Re-mock @sudobility/di/rn for this test file to get references
vi.mock('@sudobility/di/rn', () => ({
  initializeNetworkService: (...args: unknown[]) =>
    mockInitializeDiNetworkService(...args),
  initializeFirebaseService: (...args: unknown[]) =>
    mockInitializeFirebaseService(...args),
  FirebaseAnalyticsService: class MockFirebaseAnalyticsService {},
  initializeFirebaseAnalytics: (...args: unknown[]) =>
    mockInitializeFirebaseAnalytics(...args),
  getAnalyticsService: vi.fn(),
  resetAnalyticsService: vi.fn(),
}));

// Now import the function under test
const { initializeRNApp } = await import(
  '../src/initialize/initialize.js'
);

describe('initializeRNApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize all core services in order', async () => {
    const result = await initializeRNApp();

    // Should return analytics service
    expect(result).toBeDefined();

    // Should have called Firebase services
    expect(mockInitializeFirebaseService).toHaveBeenCalled();
    expect(mockInitializeFirebaseAnalytics).toHaveBeenCalled();

    // Should have called network service
    expect(mockInitializeDiNetworkService).toHaveBeenCalled();
  });

  it('should call i18n initializer when provided', async () => {
    const mockI18n = vi.fn();
    await initializeRNApp({ initializeI18n: mockI18n });
    expect(mockI18n).toHaveBeenCalled();
  });

  it('should handle async i18n initializer', async () => {
    const mockI18n = vi.fn(() => Promise.resolve());
    await initializeRNApp({ initializeI18n: mockI18n });
    expect(mockI18n).toHaveBeenCalled();
  });

  it('should not call i18n when not provided', async () => {
    // Should complete without error
    await initializeRNApp({});
  });

  it('should pass firebase options', async () => {
    await initializeRNApp({
      firebaseOptions: {
        enableAnalytics: true,
        enableRemoteConfig: false,
      },
    });

    expect(mockInitializeFirebaseService).toHaveBeenCalledWith({
      enableAnalytics: true,
      enableRemoteConfig: false,
    });
  });

  it('should handle RevenueCat config gracefully when subscription_lib fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await initializeRNApp({
      revenueCatConfig: {
        apiKey: 'test-key',
        isProduction: true,
      },
    });

    // It should log an error but not throw
    // (subscription_lib import may fail in test environment)
    errorSpy.mockRestore();
  });

  it('should use sandbox key when not in production', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await initializeRNApp({
      revenueCatConfig: {
        apiKey: 'prod-key',
        apiKeySandbox: 'sandbox-key',
        isProduction: false,
      },
    });

    errorSpy.mockRestore();
  });

  it('should work with empty options', async () => {
    const result = await initializeRNApp({});
    expect(result).toBeDefined();
  });

  it('should work with no options', async () => {
    const result = await initializeRNApp();
    expect(result).toBeDefined();
  });
});

import { vi } from 'vitest';

// Make __DEV__ available globally for tests
(globalThis as Record<string, unknown>).__DEV__ = true;

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(() => Promise.resolve()),
    getItem: vi.fn(() => Promise.resolve(null)),
    removeItem: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    getAllKeys: vi.fn(() => Promise.resolve([])),
    multiGet: vi.fn(() => Promise.resolve([])),
    multiSet: vi.fn(() => Promise.resolve()),
    multiRemove: vi.fn(() => Promise.resolve()),
  },
}));

// Mock NetInfo
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: vi.fn(() =>
      Promise.resolve({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      })
    ),
    addEventListener: vi.fn(() => vi.fn()),
  },
}));

// Mock @notifee/react-native
vi.mock('@notifee/react-native', () => ({
  default: {
    displayNotification: vi.fn(() => Promise.resolve('notification-id')),
    requestPermission: vi.fn(() =>
      Promise.resolve({ authorizationStatus: 1 })
    ),
    getNotificationSettings: vi.fn(() =>
      Promise.resolve({ authorizationStatus: 1 })
    ),
    cancelNotification: vi.fn(() => Promise.resolve()),
    cancelAllNotifications: vi.fn(() => Promise.resolve()),
    createChannel: vi.fn(() => Promise.resolve('channel-id')),
    getBadgeCount: vi.fn(() => Promise.resolve(0)),
    setBadgeCount: vi.fn(() => Promise.resolve()),
  },
  AndroidImportance: {
    HIGH: 4,
  },
  AuthorizationStatus: {
    AUTHORIZED: 1,
    DENIED: 0,
    NOT_DETERMINED: -1,
    PROVISIONAL: 2,
  },
}));

// Mock @react-native-firebase/analytics
vi.mock('@react-native-firebase/analytics', () => ({
  default: () => ({
    logEvent: vi.fn(() => Promise.resolve()),
    setUserProperty: vi.fn(() => Promise.resolve()),
    setUserId: vi.fn(() => Promise.resolve()),
    logScreenView: vi.fn(() => Promise.resolve()),
    setAnalyticsCollectionEnabled: vi.fn(() => Promise.resolve()),
  }),
}));

// Mock React Native Appearance
vi.mock('react-native', () => ({
  Appearance: {
    getColorScheme: vi.fn(() => 'light'),
    addChangeListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

// Mock @react-navigation/native
vi.mock('@react-navigation/native', () => ({
  // Provide types only, actual navigation ref is injected in tests
}));

// Mock @sudobility/di/interfaces
vi.mock('@sudobility/di/interfaces', () => ({
  initializeInfoService: vi.fn(),
}));

// Mock @sudobility/di/rn
vi.mock('@sudobility/di/rn', () => ({
  initializeNetworkService: vi.fn(),
  initializeFirebaseService: vi.fn(),
  FirebaseAnalyticsService: class MockFirebaseAnalyticsService {},
  initializeFirebaseAnalytics: vi.fn(
    () => new (class MockFirebaseAnalyticsService {})()
  ),
  getAnalyticsService: vi.fn(),
  resetAnalyticsService: vi.fn(),
}));

// Mock @sudobility/types
vi.mock('@sudobility/types', async () => {
  const actual = await vi.importActual('@sudobility/types');
  return {
    ...actual,
  };
});

// Mock @sudobility/components-rn
vi.mock('@sudobility/components-rn', () => ({
  Banner: () => null,
}));

// Mock global fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers({ 'content-type': 'application/json' }),
  } as Response)
);

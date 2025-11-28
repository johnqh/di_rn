import { vi } from 'vitest';

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

// Mock react-native-config
vi.mock('react-native-config', () => ({
  default: {
    VITE_INDEXER_URL: 'https://test-indexer.example.com',
    VITE_WILDDUCK_URL: 'https://test-wildduck.example.com',
    VITE_WALLETCONNECT_PROJECT_ID: 'test-project-id',
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

// Mock global fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
  } as Response)
);

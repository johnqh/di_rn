/**
 * @sudobility/di_rn
 *
 * React Native implementations of dependency injection services for Signa Email.
 * This package provides platform-specific implementations of the interfaces
 * defined in @sudobility/di.
 */

// Storage
export {
  RNStorage,
  AdvancedRNStorage,
  rnStorage,
  advancedRNStorage,
} from './storage/storage.rn.js';

export {
  RNStorageService,
  RNSerializedStorageService,
  getStorageService,
  initializeStorageService,
  resetStorageService,
} from './storage/storage-singleton.js';

// Network
export {
  RNNetworkClient,
  RNNetworkService,
  NetworkError,
  rnNetworkClient,
  rnNetworkService,
  setNetInfoModule,
} from './network/network.rn.js';

export {
  getNetworkService,
  initializeNetworkService,
  resetNetworkService,
  getNetworkClient,
  initializeNetworkClient,
  resetNetworkClient,
} from './network/network-singleton.js';

// Environment
export {
  RNEnvProvider,
  createRNAppConfig,
  rnEnvProvider,
  rnAppConfig,
} from './env/env.rn.js';

export type {
  EnvProvider,
  AppConfig,
  EnvironmentVariables,
  FirebaseConfig,
} from './env/env.rn.js';

// Notifications
export {
  RNNotificationService,
  getNotificationService,
  initializeNotificationService,
  resetNotificationService,
  rnNotificationService,
  setNotifeeModule,
} from './notification/notification.rn.js';

// Theme
export {
  RNThemeService,
  getThemeService,
  initializeThemeService,
  resetThemeService,
  rnThemeService,
  setAppearanceModule,
} from './theme/theme.rn.js';

export type { ThemeMode, FontSize } from './theme/theme.rn.js';

// Logging
export {
  RNLogger,
  RNLoggerProvider,
  getLoggerProvider,
  getLogger,
  initializeLoggerProvider,
  resetLoggerProvider,
  rnLogger,
  rnLoggerProvider,
} from './logging/logging.rn.js';

// Navigation
export {
  RNNavigationService,
  getNavigationService,
  initializeNavigationService,
  resetNavigationService,
  rnNavigationService,
} from './navigation/navigation.rn.js';

// Info service (banner messages)
export {
  RNInfoService,
  createRNInfoService,
  initializeInfoService,
  getInfoService,
  resetInfoService,
  type BannerState,
  type BannerStateListener,
  InfoBanner,
  useInfoBanner,
} from './info/index.js';

// Initialize (centralized app initialization)
export {
  initializeRNApp,
  type RNAppInitOptions,
  type RevenueCatConfig,
  type RNFirebaseOptions,
  FirebaseAnalyticsService,
  initializeFirebaseAnalytics,
  getAnalyticsService,
  resetAnalyticsService,
  type AnalyticsEventParams,
} from './initialize/index.js';

// Re-export Firebase from @sudobility/di/rn for convenience
// This allows existing code importing from di_rn to continue working
export {
  RNFirebaseService,
  RNFirebaseAnalyticsService,
  createRNFirebaseService,
  getFirebaseService,
  initializeFirebaseService,
  resetFirebaseService,
} from '@sudobility/di/rn';

// Re-export the low-level analytics client from @sudobility/di/rn
export {
  RNAnalyticsClient,
  getAnalyticsClient,
  initializeAnalyticsClient,
  resetAnalyticsClient,
  rnAnalyticsClient,
} from '@sudobility/di/rn';

// Diagnostics
export {
  checkNativeModules,
  type NativeModuleStatus,
  type NativeModuleDiagnostics,
} from './diagnostics.js';

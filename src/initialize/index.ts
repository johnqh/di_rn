/**
 * Initialize module exports for React Native
 *
 * Provides initializeRNApp function for centralized app initialization
 * and FirebaseAnalyticsService for analytics tracking.
 */

export {
  // Main initialization function
  initializeRNApp,
  type RNAppInitOptions,
  type RevenueCatConfig,
  type RNFirebaseOptions,

  // Firebase Analytics Service
  FirebaseAnalyticsService,
  initializeFirebaseAnalytics,
  getAnalyticsService,
  resetAnalyticsService,
  type AnalyticsEventParams,
} from './initialize.js';

/**
 * @fileoverview Centralized React Native app initialization
 * @description Provides a single initialization function for RN apps
 * that sets up all DI services in the correct order.
 */

import {
  initializeNetworkService as initializeDiNetworkService,
  initializeFirebaseService,
  FirebaseAnalyticsService,
  initializeFirebaseAnalytics,
  getAnalyticsService,
  resetAnalyticsService,
  type AnalyticsEventParams,
  type FirebaseInitOptions,
} from '@sudobility/di/rn';
import { initializeStorageService } from '../index.js';
import { initializeInfoService } from '../info/index.js';

// Re-export analytics types and functions from di for convenience
export {
  FirebaseAnalyticsService,
  initializeFirebaseAnalytics,
  getAnalyticsService,
  resetAnalyticsService,
  type AnalyticsEventParams,
};

// ============================================================================
// RN App Initialization
// ============================================================================

/**
 * RevenueCat configuration
 */
export interface RevenueCatConfig {
  /** RevenueCat API key (production) */
  apiKey: string;

  /** RevenueCat API key (sandbox) - optional, uses production key if not provided */
  apiKeySandbox?: string;

  /** Whether we're in production mode (affects which key to use) */
  isProduction?: boolean;

  /** Free tier package configuration */
  freeTierPackage?: { packageId: string; name: string };
}

/**
 * Firebase options for RN
 */
export interface RNFirebaseOptions {
  /** Enable Firebase Analytics (default: true) */
  enableAnalytics?: boolean;
  /** Enable Firebase Remote Config (default: true) */
  enableRemoteConfig?: boolean;
  /** Enable Firebase Messaging (default: true) */
  enableMessaging?: boolean;
  /** Enable development mode (default: false) */
  enableDevelopmentMode?: boolean;
}

/**
 * Configuration options for RN app initialization
 */
export interface RNAppInitOptions {
  /** Enable Firebase Auth and auth-aware network service */
  enableFirebaseAuth?: boolean;

  /** RevenueCat configuration - if provided, enables RevenueCat */
  revenueCatConfig?: RevenueCatConfig;

  /** Optional: Initialize i18n (app-specific, pass your initializeI18n function) */
  initializeI18n?: () => void | Promise<void>;

  /** Firebase options */
  firebaseOptions?: RNFirebaseOptions;
}

/**
 * Initialize a React Native application with all required DI services.
 *
 * This function sets up services in the correct order:
 * 1. Storage service
 * 2. Firebase DI service (analytics, remote config, etc.)
 * 3. Firebase Analytics singleton
 * 4. Firebase Auth + Network (if enableFirebaseAuth)
 * 5. Info service
 * 6. RevenueCat (if revenueCatConfig provided)
 * 7. i18n (if provided)
 *
 * @param options - Configuration options
 * @returns The initialized analytics service
 */
export async function initializeRNApp(
  options: RNAppInitOptions = {}
): Promise<FirebaseAnalyticsService> {
  const {
    enableFirebaseAuth = false,
    revenueCatConfig,
    initializeI18n,
    firebaseOptions,
  } = options;

  // 1. Initialize storage service
  initializeStorageService();

  // 2. Initialize Firebase DI service (configured via native files, options just enable/disable features)
  initializeFirebaseService(firebaseOptions as FirebaseInitOptions);

  // 3. Initialize Firebase Analytics singleton (higher-level wrapper)
  const analytics = initializeFirebaseAnalytics();

  // 4. Initialize Firebase Auth (if enabled)
  if (enableFirebaseAuth) {
    try {
      // Dynamically import auth_lib to avoid hard dependency
      // The react-native export path will be resolved automatically
      const authLib = await import('@sudobility/auth_lib');
      authLib.initializeFirebaseAuth();
    } catch (error) {
      console.error(
        '[di_rn] Failed to initialize Firebase Auth. Make sure @sudobility/auth_lib is installed.',
        error
      );
    }
  }

  // 5. Initialize network service (for online/offline status detection)
  // Note: For authenticated API calls, apps should use FirebaseAuthNetworkService directly
  // from @sudobility/auth_lib, which provides automatic token refresh on 401 responses.
  initializeDiNetworkService();

  // 6. Initialize info service
  initializeInfoService();

  // 7. Initialize RevenueCat subscription (if config provided)
  if (revenueCatConfig) {
    try {
      const subscriptionLib = await import('@sudobility/subscription_lib');
      const isProduction = revenueCatConfig.isProduction ?? true;
      const apiKey = isProduction
        ? revenueCatConfig.apiKey
        : (revenueCatConfig.apiKeySandbox ?? revenueCatConfig.apiKey);

      // Use the RN adapter
      subscriptionLib.configureRevenueCatRNAdapter(apiKey);
      subscriptionLib.initializeSubscription({
        adapter: subscriptionLib.createRevenueCatRNAdapter(),
        freeTier: revenueCatConfig.freeTierPackage ?? {
          packageId: 'free',
          name: 'Free',
        },
      });
    } catch (error) {
      console.error(
        '[di_rn] Failed to initialize RevenueCat. Make sure @sudobility/subscription_lib is installed.',
        error
      );
    }
  }

  // 8. Initialize i18n (app-specific)
  if (initializeI18n) {
    await initializeI18n();
  }

  return analytics;
}

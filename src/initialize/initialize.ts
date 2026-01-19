/**
 * @fileoverview Centralized React Native app initialization
 * @description Provides a single initialization function for RN apps
 * that sets up all DI services in the correct order.
 */

import {
  initializeFirebaseService,
  getFirebaseService,
  initializeNetworkService as initializeDiNetworkService,
} from '@sudobility/di/rn';
import { initializeStorageService } from '../index.js';
import { initializeInfoService } from '../info/index.js';
import {
  initializeAnalyticsClient,
  getAnalyticsClient,
} from '../analytics/analytics.rn.js';

// ============================================================================
// Firebase Analytics Service (higher-level wrapper)
// ============================================================================

export interface AnalyticsEventParams {
  [key: string]: unknown;
}

/**
 * Firebase Analytics Service class for React Native
 * Uses the DI Firebase service for analytics tracking.
 */
export class FirebaseAnalyticsService {
  /**
   * Track a custom event
   */
  trackEvent(eventName: string, params?: AnalyticsEventParams): void {
    try {
      const service = getFirebaseService();
      if (service.analytics.isSupported()) {
        service.analytics.logEvent(eventName, {
          ...params,
          timestamp: Date.now(),
        });
      }
    } catch {
      // Firebase service not initialized
    }
  }

  /**
   * Track a screen view
   */
  trackScreenView(screenName: string, screenClass?: string): void {
    this.trackEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass ?? screenName,
    });
  }

  /**
   * Track a button click
   */
  trackButtonClick(buttonName: string, params?: AnalyticsEventParams): void {
    this.trackEvent('button_click', {
      button_name: buttonName,
      ...params,
    });
  }

  /**
   * Track a link click
   */
  trackLinkClick(
    linkUrl: string,
    linkText?: string,
    params?: AnalyticsEventParams
  ): void {
    this.trackEvent('link_click', {
      link_url: linkUrl,
      link_text: linkText,
      ...params,
    });
  }

  /**
   * Track an error
   */
  trackError(errorMessage: string, errorCode?: string): void {
    this.trackEvent('error_occurred', {
      error_message: errorMessage,
      error_code: errorCode,
    });
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    try {
      const service = getFirebaseService();
      return service.analytics.isSupported();
    } catch {
      return false;
    }
  }
}

// Singleton instance
let analyticsService: FirebaseAnalyticsService | null = null;

/**
 * Initialize the Firebase Analytics service singleton
 */
export function initializeFirebaseAnalytics(): FirebaseAnalyticsService {
  if (!analyticsService) {
    analyticsService = new FirebaseAnalyticsService();
  }
  return analyticsService;
}

/**
 * Get the Firebase Analytics service singleton
 * @throws Error if not initialized
 */
export function getAnalyticsService(): FirebaseAnalyticsService {
  if (!analyticsService) {
    throw new Error(
      'Analytics service not initialized. Call initializeFirebaseAnalytics() first.'
    );
  }
  return analyticsService;
}

/**
 * Reset the analytics service (for testing)
 */
export function resetAnalyticsService(): void {
  analyticsService = null;
}

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
 * 4. Analytics client singleton
 * 5. Firebase Auth + Network (if enableFirebaseAuth)
 * 6. Info service
 * 7. RevenueCat (if revenueCatConfig provided)
 * 8. i18n (if provided)
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

  // 2. Initialize Firebase DI service (analytics, remote config, etc.)
  // Note: RN Firebase is configured via native files, not JS config
  initializeFirebaseService(firebaseOptions);

  // 3. Initialize Firebase Analytics singleton (higher-level wrapper)
  const analytics = initializeFirebaseAnalytics();

  // 4. Initialize Analytics client singleton (lower-level)
  initializeAnalyticsClient();

  // 5. Initialize Auth and Network service
  if (enableFirebaseAuth) {
    try {
      // Dynamically import auth_lib to avoid hard dependency
      // The react-native export path will be resolved automatically
      const authLib = await import('@sudobility/auth_lib');
      authLib.initializeFirebaseAuth();
      // Use auth_lib's FirebaseAuthNetworkService which has 401 retry and 403 logout logic
      initializeDiNetworkService(new authLib.FirebaseAuthNetworkService());
    } catch (error) {
      console.error(
        '[di_rn] Failed to initialize Firebase Auth. Make sure @sudobility/auth_lib is installed.',
        error
      );
      // Fall back to basic network service
      initializeDiNetworkService();
    }
  } else {
    // Initialize basic network service without auth retry logic
    initializeDiNetworkService();
  }

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
      subscriptionLib.configureRevenueCatAdapter(apiKey);
      subscriptionLib.initializeSubscription({
        adapter: subscriptionLib.createRevenueCatAdapter(),
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

/**
 * Get low-level analytics client for direct access
 */
export { getAnalyticsClient };

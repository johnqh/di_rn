import analytics from '@react-native-firebase/analytics';
import type {
  AnalyticsClient,
  AnalyticsEventData,
  AnalyticsEvent,
} from '@sudobility/di';
import type { Optional } from '@sudobility/types';

/**
 * React Native Analytics Client using Firebase Analytics.
 */
export class RNAnalyticsClient implements AnalyticsClient {
  private enabled: boolean = true;
  private userId: Optional<string> = null;

  /**
   * Track an event with optional parameters.
   */
  trackEvent(eventOrData: AnalyticsEvent | AnalyticsEventData): void {
    if (!this.enabled) return;

    // Check if it's an AnalyticsEventData object
    if (typeof eventOrData === 'object' && 'event' in eventOrData) {
      const { event, parameters } = eventOrData;
      analytics()
        .logEvent(event, parameters as Record<string, string | number>)
        .catch(() => {
          // Silently handle analytics errors
        });
    } else {
      // It's just an AnalyticsEvent (string)
      analytics()
        .logEvent(eventOrData)
        .catch(() => {
          // Silently handle analytics errors
        });
    }
  }

  /**
   * Set user properties for segmentation.
   */
  setUserProperties(properties: Record<string, unknown>): void {
    if (!this.enabled) return;

    for (const [key, value] of Object.entries(properties)) {
      analytics()
        .setUserProperty(key, String(value))
        .catch(() => {
          // Silently handle analytics errors
        });
    }
  }

  /**
   * Set the user ID for analytics.
   */
  setUserId(userId: Optional<string>): void {
    this.userId = userId;
    if (!this.enabled) return;

    analytics()
      .setUserId(userId ?? null)
      .catch(() => {
        // Silently handle analytics errors
      });
  }

  /**
   * Enable or disable analytics collection.
   */
  setAnalyticsEnabled(enabled: boolean): void {
    this.enabled = enabled;
    analytics()
      .setAnalyticsCollectionEnabled(enabled)
      .catch(() => {
        // Silently handle analytics errors
      });
  }

  /**
   * Set the current screen name for screen tracking.
   */
  setCurrentScreen(screenName: string, screenClass?: Optional<string>): void {
    if (!this.enabled) return;

    analytics()
      .logScreenView({
        screen_name: screenName,
        screen_class: screenClass ?? screenName,
      })
      .catch(() => {
        // Silently handle analytics errors
      });
  }

  /**
   * Check if analytics is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get the current user ID.
   */
  getUserId(): Optional<string> {
    return this.userId;
  }
}

// Singleton instance
let analyticsClient: RNAnalyticsClient | null = null;

export function getAnalyticsClient(): RNAnalyticsClient {
  if (!analyticsClient) {
    analyticsClient = new RNAnalyticsClient();
  }
  return analyticsClient;
}

export function initializeAnalyticsClient(
  client?: RNAnalyticsClient
): RNAnalyticsClient {
  analyticsClient = client ?? new RNAnalyticsClient();
  return analyticsClient;
}

export function resetAnalyticsClient(): void {
  analyticsClient = null;
}

export const rnAnalyticsClient = new RNAnalyticsClient();

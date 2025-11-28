import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';
import type {
  NotificationService,
  NotificationOptions,
  NotificationResult,
  NotificationCapabilities,
  NotificationPermissionResult,
} from '@sudobility/di';
import type { Optional } from '@sudobility/types';

/**
 * React Native Notification Service using Notifee.
 * Provides local notifications on iOS and Android.
 */
export class RNNotificationService implements NotificationService {
  private clickHandler: Optional<(data?: Optional<unknown>) => void> = null;
  private defaultChannelId: string = 'default';

  constructor() {
    this.setupDefaultChannel();
  }

  /**
   * Set up the default notification channel for Android.
   */
  private setupDefaultChannel(): void {
    notifee
      .createChannel({
        id: this.defaultChannelId,
        name: 'Default Notifications',
        importance: AndroidImportance.HIGH,
      })
      .catch(() => {
        // Silently handle channel creation errors
      });
  }

  /**
   * Check if notifications are supported.
   */
  isSupported(): boolean {
    // Notifee is always available on RN
    return true;
  }

  /**
   * Display a notification.
   */
  async showNotification(
    title: string,
    options?: Optional<NotificationOptions>
  ): Promise<NotificationResult> {
    try {
      const notificationConfig: Parameters<
        typeof notifee.displayNotification
      >[0] = {
        title,
        android: {
          channelId: this.defaultChannelId,
          smallIcon: options?.icon ?? 'ic_notification',
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
      };

      if (options?.body) {
        notificationConfig.body = options.body;
      }

      if (options?.data) {
        notificationConfig.data = options.data as Record<string, string>;
      }

      const notificationId =
        await notifee.displayNotification(notificationConfig);

      return {
        success: true,
        notificationId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Request notification permissions.
   */
  async requestPermission(): Promise<NotificationPermissionResult> {
    try {
      const settings = await notifee.requestPermission();
      const granted =
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

      return {
        granted,
        permission: granted ? 'granted' : 'denied',
      };
    } catch (error) {
      return {
        granted: false,
        permission: 'denied',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current permission status.
   */
  getPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
    // This is synchronous but we need to handle the async nature
    // In RN, we typically check this async, but the interface requires sync
    // We'll return 'default' and let consumers use requestPermission for accurate status
    return 'default';
  }

  /**
   * Check if we have notification permission.
   */
  hasPermission(): boolean {
    // Similar to getPermissionStatus, this would need to be async in RN
    // Return true optimistically, consumers should use requestPermission
    return true;
  }

  /**
   * Set a handler for notification clicks.
   */
  setClickHandler(handler: (data?: Optional<unknown>) => void): void {
    this.clickHandler = handler;
  }

  /**
   * Get the current click handler.
   */
  getClickHandler(): Optional<(data?: Optional<unknown>) => void> {
    return this.clickHandler;
  }

  /**
   * Get notification capabilities for this platform.
   */
  getCapabilities(): NotificationCapabilities {
    return {
      supportsActions: true,
      supportsIcon: true,
      supportsBadge: true,
      supportsData: true,
      supportsSound: true,
      supportsVibration: true,
      maxActions: 3,
    };
  }

  /**
   * Close a specific notification.
   */
  async closeNotification(notificationId: string): Promise<boolean> {
    try {
      await notifee.cancelNotification(notificationId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all notifications.
   */
  async clearAllNotifications(): Promise<boolean> {
    try {
      await notifee.cancelAllNotifications();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the badge count (iOS only).
   */
  async getBadgeCount(): Promise<number> {
    return notifee.getBadgeCount();
  }

  /**
   * Set the badge count (iOS only).
   */
  async setBadgeCount(count: number): Promise<void> {
    await notifee.setBadgeCount(count);
  }
}

// Singleton instance
let notificationService: RNNotificationService | null = null;

export function getNotificationService(): RNNotificationService {
  if (!notificationService) {
    notificationService = new RNNotificationService();
  }
  return notificationService;
}

export function initializeNotificationService(
  service?: RNNotificationService
): RNNotificationService {
  notificationService = service ?? new RNNotificationService();
  return notificationService;
}

export function resetNotificationService(): void {
  notificationService = null;
}

export const rnNotificationService = new RNNotificationService();

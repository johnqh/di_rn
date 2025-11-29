import type {
  NotificationService,
  NotificationOptions,
  NotificationResult,
  NotificationCapabilities,
  NotificationPermissionResult,
} from '@sudobility/di';
import type { Optional } from '@sudobility/types';

// Lazy load notifee to avoid crashes if native module is not linked
type NotifeeModule = typeof import('@notifee/react-native');
let notifeeModule: NotifeeModule | null = null;
let AndroidImportanceValue: number = 4; // HIGH
let AuthorizationStatusAuthorized: number = 1;
let AuthorizationStatusProvisional: number = 3;

function getNotifee() {
  if (!notifeeModule) {
    try {
      const mod = require('@notifee/react-native');
      notifeeModule = mod;
      AndroidImportanceValue = mod.AndroidImportance?.HIGH ?? 4;
      AuthorizationStatusAuthorized = mod.AuthorizationStatus?.AUTHORIZED ?? 1;
      AuthorizationStatusProvisional =
        mod.AuthorizationStatus?.PROVISIONAL ?? 3;
    } catch (e) {
      console.warn('Notifee not available:', e);
    }
  }
  return notifeeModule?.default ?? null;
}

/**
 * React Native Notification Service using Notifee.
 * Provides local notifications on iOS and Android.
 */
export class RNNotificationService implements NotificationService {
  private clickHandler: Optional<(data?: Optional<unknown>) => void> = null;
  private defaultChannelId: string = 'default';
  private channelCreated: boolean = false;

  constructor() {
    // Defer channel setup to avoid native module issues at load time
  }

  /**
   * Set up the default notification channel for Android.
   */
  private async ensureChannel(): Promise<void> {
    if (this.channelCreated) return;
    const notifee = getNotifee();
    if (!notifee) return;

    this.channelCreated = true;
    try {
      await notifee.createChannel({
        id: this.defaultChannelId,
        name: 'Default Notifications',
        importance: AndroidImportanceValue,
      });
    } catch {
      // Silently handle channel creation errors
    }
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
    const notifee = getNotifee();
    if (!notifee) {
      return { success: false, error: 'Notifications not available' };
    }

    await this.ensureChannel();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notificationConfig: any = {
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
        notificationConfig.data = options.data;
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
    const notifee = getNotifee();
    if (!notifee) {
      return {
        granted: false,
        permission: 'denied',
        error: 'Notifications not available',
      };
    }

    try {
      const settings = await notifee.requestPermission();
      const granted =
        settings.authorizationStatus === AuthorizationStatusAuthorized ||
        settings.authorizationStatus === AuthorizationStatusProvisional;

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
    const notifee = getNotifee();
    if (!notifee) return false;

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
    const notifee = getNotifee();
    if (!notifee) return false;

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
    const notifee = getNotifee();
    if (!notifee) return 0;
    return notifee.getBadgeCount();
  }

  /**
   * Set the badge count (iOS only).
   */
  async setBadgeCount(count: number): Promise<void> {
    const notifee = getNotifee();
    if (!notifee) return;
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

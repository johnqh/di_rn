import type {
  NotificationService,
  NotificationOptions,
  NotificationResult,
  NotificationCapabilities,
  NotificationPermissionResult,
} from '@sudobility/di/interfaces';
import type { Optional } from '@sudobility/types';

// Lazy load notifee to avoid crashes if native module is not linked
type NotifeeModule = typeof import('@notifee/react-native');

/** The Notifee default export type (the main API object). */
type NotifeeApi = NotifeeModule['default'];

let notifeeModule: NotifeeModule | null = null;
let notifeeApiOverride: NotifeeApi | null = null;
let AndroidImportanceValue: number = 4; // HIGH
let AuthorizationStatusAuthorized: number = 1;
let AuthorizationStatusProvisional: number = 3;

/**
 * Inject a mock or custom Notifee API for testing.
 *
 * @param api - The Notifee API to use, or `null` to reset and use the real module.
 *
 * @example
 * ```ts
 * // In tests:
 * setNotifeeModule(mockNotifeeApi);
 * ```
 */
export function setNotifeeModule(api: NotifeeApi | null): void {
  notifeeApiOverride = api;
}

/**
 * Lazily load and return the Notifee native module's default export.
 *
 * Uses `require()` inside a try-catch to avoid crashes when the native module
 * is not linked. Also caches the `AndroidImportance` and `AuthorizationStatus`
 * constants from the module.
 *
 * @returns The Notifee API object, or `null` if not available.
 */
function getNotifee(): NotifeeApi | null {
  if (notifeeApiOverride) return notifeeApiOverride;

  if (!notifeeModule) {
    try {
      const mod: NotifeeModule = require('@notifee/react-native');
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
 *
 * Provides local notifications on iOS and Android, implementing
 * `NotificationService` from `@sudobility/di/interfaces`.
 * Uses lazy native module loading -- Notifee is loaded on first use
 * via `require()` in a try-catch to prevent crashes when not linked.
 *
 * @example
 * ```ts
 * const service = new RNNotificationService();
 * await service.requestPermission();
 * await service.showNotification('New Email', {
 *   body: 'You have a new message',
 *   data: { emailId: '123' },
 * });
 * ```
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
   * Called automatically before showing the first notification.
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
   * Check if notifications are supported on this platform.
   *
   * @returns `true` -- notifications are always supported on React Native.
   */
  isSupported(): boolean {
    // Notifee is always available on RN
    return true;
  }

  /**
   * Display a local notification.
   *
   * @param title - The notification title.
   * @param options - Optional notification configuration (body, data, icon).
   * @returns A result indicating success/failure and the notification ID.
   *
   * @example
   * ```ts
   * const result = await service.showNotification('Alert', {
   *   body: 'Something happened',
   * });
   * if (result.success) {
   *   console.log('Notification ID:', result.notificationId);
   * }
   * ```
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
   * Request notification permissions from the user.
   *
   * @returns A result indicating whether permission was granted.
   *
   * @example
   * ```ts
   * const { granted } = await service.requestPermission();
   * if (granted) {
   *   // Can show notifications
   * }
   * ```
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
   * Get current permission status synchronously.
   *
   * In React Native, permission status must be checked asynchronously.
   * This returns `'default'` as a placeholder; use `requestPermission()` for
   * accurate status.
   *
   * @returns `'default'` -- consumers should use `requestPermission()` instead.
   */
  getPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
    return 'default';
  }

  /**
   * Check if we have notification permission (optimistic).
   *
   * Returns `true` optimistically; consumers should use `requestPermission()`
   * for an accurate check.
   *
   * @returns `true`.
   */
  hasPermission(): boolean {
    return true;
  }

  /**
   * Set a handler for notification click events.
   *
   * @param handler - Function invoked with notification data when a notification is clicked.
   *
   * @example
   * ```ts
   * service.setClickHandler((data) => {
   *   const emailId = (data as { emailId: string })?.emailId;
   *   navigate('EmailDetail', { emailId });
   * });
   * ```
   */
  setClickHandler(handler: (data?: Optional<unknown>) => void): void {
    this.clickHandler = handler;
  }

  /**
   * Get the current notification click handler.
   *
   * @returns The click handler function, or `null` if none is set.
   */
  getClickHandler(): Optional<(data?: Optional<unknown>) => void> {
    return this.clickHandler;
  }

  /**
   * Get notification capabilities for this platform.
   *
   * @returns An object describing supported notification features.
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
   * Close (cancel) a specific notification by ID.
   *
   * @param notificationId - The ID of the notification to cancel.
   * @returns `true` if the notification was successfully cancelled.
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
   * Clear all displayed notifications.
   *
   * @returns `true` if all notifications were successfully cancelled.
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
   * Get the current badge count (iOS only).
   *
   * @returns The current badge count, or `0` if Notifee is unavailable.
   */
  async getBadgeCount(): Promise<number> {
    const notifee = getNotifee();
    if (!notifee) return 0;
    return notifee.getBadgeCount();
  }

  /**
   * Set the badge count (iOS only).
   *
   * @param count - The badge count to set.
   */
  async setBadgeCount(count: number): Promise<void> {
    const notifee = getNotifee();
    if (!notifee) return;
    await notifee.setBadgeCount(count);
  }

  /**
   * Dispose of the notification service.
   *
   * Clears the click handler and resets channel state.
   */
  dispose(): void {
    this.clickHandler = null;
    this.channelCreated = false;
  }
}

// Singleton instance
let notificationService: RNNotificationService | null = null;

/**
 * Get the notification service singleton, auto-creating one if not yet initialized.
 *
 * @returns The `RNNotificationService` singleton instance.
 *
 * @example
 * ```ts
 * const notifications = getNotificationService();
 * await notifications.showNotification('Hello!');
 * ```
 */
export function getNotificationService(): RNNotificationService {
  if (!notificationService) {
    notificationService = new RNNotificationService();
  }
  return notificationService;
}

/**
 * Initialize the notification service singleton, optionally injecting a custom instance.
 *
 * @param service - Optional custom `RNNotificationService` instance. If omitted, a new one is created.
 * @returns The initialized `RNNotificationService` singleton.
 *
 * @example
 * ```ts
 * initializeNotificationService();
 * ```
 */
export function initializeNotificationService(
  service?: RNNotificationService
): RNNotificationService {
  if (notificationService) {
    notificationService.dispose();
  }
  notificationService = service ?? new RNNotificationService();
  return notificationService;
}

/**
 * Reset the notification service singleton to `null`.
 *
 * Disposes the current instance if one exists.
 *
 * @example
 * ```ts
 * resetNotificationService();
 * ```
 */
export function resetNotificationService(): void {
  if (notificationService) {
    notificationService.dispose();
    notificationService = null;
  }
}

export const rnNotificationService = new RNNotificationService();

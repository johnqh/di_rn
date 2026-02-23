import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RNNotificationService,
  getNotificationService,
  initializeNotificationService,
  resetNotificationService,
  setNotifeeModule,
} from '../src/notification/notification.rn.js';

// Create mock Notifee API
const mockNotifee = {
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
};

describe('RNNotificationService', () => {
  let service: RNNotificationService;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setNotifeeModule(mockNotifee as any);
    service = new RNNotificationService();
    vi.clearAllMocks();
  });

  describe('isSupported', () => {
    it('should return true', () => {
      expect(service.isSupported()).toBe(true);
    });
  });

  describe('showNotification', () => {
    it('should display a notification and return success', async () => {
      const result = await service.showNotification('Test Title', {
        body: 'Test body',
      });

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('notification-id');
    });

    it('should display a notification with data', async () => {
      const result = await service.showNotification('Test', {
        body: 'Body',
        data: { emailId: '123' },
      });

      expect(result.success).toBe(true);
    });

    it('should display a notification with custom icon', async () => {
      const result = await service.showNotification('Test', {
        icon: 'custom_icon',
      });

      expect(result.success).toBe(true);
    });

    it('should handle minimal notification (title only)', async () => {
      const result = await service.showNotification('Just a title');
      expect(result.success).toBe(true);
    });

    it('should create default channel before showing first notification', async () => {
      await service.showNotification('Test');
      expect(mockNotifee.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'default',
          name: 'Default Notifications',
        })
      );
    });

    it('should return failure when notifee is not available', async () => {
      setNotifeeModule(null);
      const freshService = new RNNotificationService();
      const result = await freshService.showNotification('Test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Notifications not available');
    });
  });

  describe('requestPermission', () => {
    it('should request and return granted status', async () => {
      const result = await service.requestPermission();
      expect(result.granted).toBe(true);
      expect(result.permission).toBe('granted');
    });

    it('should return denied when notifee is not available', async () => {
      setNotifeeModule(null);
      const freshService = new RNNotificationService();
      const result = await freshService.requestPermission();
      expect(result.granted).toBe(false);
      expect(result.permission).toBe('denied');
    });
  });

  describe('getPermissionStatus', () => {
    it('should return default', () => {
      expect(service.getPermissionStatus()).toBe('default');
    });
  });

  describe('hasPermission', () => {
    it('should return true optimistically', () => {
      expect(service.hasPermission()).toBe(true);
    });
  });

  describe('setClickHandler / getClickHandler', () => {
    it('should set and get click handler', () => {
      const handler = vi.fn();
      service.setClickHandler(handler);
      expect(service.getClickHandler()).toBe(handler);
    });

    it('should return null when no handler is set', () => {
      expect(service.getClickHandler()).toBeNull();
    });
  });

  describe('getCapabilities', () => {
    it('should return platform capabilities', () => {
      const caps = service.getCapabilities();
      expect(caps.supportsActions).toBe(true);
      expect(caps.supportsIcon).toBe(true);
      expect(caps.supportsBadge).toBe(true);
      expect(caps.supportsData).toBe(true);
      expect(caps.supportsSound).toBe(true);
      expect(caps.supportsVibration).toBe(true);
      expect(caps.maxActions).toBe(3);
    });
  });

  describe('closeNotification', () => {
    it('should cancel a notification by ID', async () => {
      const result = await service.closeNotification('some-id');
      expect(result).toBe(true);
      expect(mockNotifee.cancelNotification).toHaveBeenCalledWith('some-id');
    });

    it('should return false when notifee is not available', async () => {
      setNotifeeModule(null);
      const freshService = new RNNotificationService();
      const result = await freshService.closeNotification('id');
      expect(result).toBe(false);
    });
  });

  describe('clearAllNotifications', () => {
    it('should cancel all notifications', async () => {
      const result = await service.clearAllNotifications();
      expect(result).toBe(true);
      expect(mockNotifee.cancelAllNotifications).toHaveBeenCalled();
    });

    it('should return false when notifee is not available', async () => {
      setNotifeeModule(null);
      const freshService = new RNNotificationService();
      const result = await freshService.clearAllNotifications();
      expect(result).toBe(false);
    });
  });

  describe('getBadgeCount', () => {
    it('should return the badge count', async () => {
      const count = await service.getBadgeCount();
      expect(count).toBe(0);
    });

    it('should return 0 when notifee is not available', async () => {
      setNotifeeModule(null);
      const freshService = new RNNotificationService();
      const count = await freshService.getBadgeCount();
      expect(count).toBe(0);
    });
  });

  describe('setBadgeCount', () => {
    it('should set the badge count', async () => {
      await service.setBadgeCount(5);
      expect(mockNotifee.setBadgeCount).toHaveBeenCalledWith(5);
    });
  });

  describe('dispose', () => {
    it('should clear click handler', () => {
      service.setClickHandler(vi.fn());
      service.dispose();
      expect(service.getClickHandler()).toBeNull();
    });

    it('should reset channel state', async () => {
      // Show a notification to trigger channel creation
      await service.showNotification('Test');
      vi.clearAllMocks();

      service.dispose();

      // After dispose, showing another notification should re-create channel
      await service.showNotification('Test Again');
      expect(mockNotifee.createChannel).toHaveBeenCalled();
    });
  });
});

describe('Notification Singleton Management', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setNotifeeModule(mockNotifee as any);
    resetNotificationService();
  });

  describe('getNotificationService', () => {
    it('should auto-create service on first call', () => {
      const service = getNotificationService();
      expect(service).toBeInstanceOf(RNNotificationService);
    });

    it('should return the same instance on subsequent calls', () => {
      const s1 = getNotificationService();
      const s2 = getNotificationService();
      expect(s1).toBe(s2);
    });
  });

  describe('initializeNotificationService', () => {
    it('should create a new service', () => {
      const service = initializeNotificationService();
      expect(service).toBeInstanceOf(RNNotificationService);
    });

    it('should accept a custom instance', () => {
      const custom = new RNNotificationService();
      const service = initializeNotificationService(custom);
      expect(service).toBe(custom);
    });

    it('should dispose previous service', () => {
      const first = initializeNotificationService();
      const disposeSpy = vi.spyOn(first, 'dispose');
      initializeNotificationService();
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('resetNotificationService', () => {
    it('should reset singleton to null', () => {
      const first = initializeNotificationService();
      const disposeSpy = vi.spyOn(first, 'dispose');
      resetNotificationService();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should not throw if no service exists', () => {
      expect(() => resetNotificationService()).not.toThrow();
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RNNavigationService,
  getNavigationService,
  initializeNavigationService,
  resetNavigationService,
} from '../src/navigation/navigation.rn.js';

// Helper to create a mock navigation ref
function createMockNavigationRef(
  overrides: Partial<{
    isReady: () => boolean;
    canGoBack: () => boolean;
    goBack: () => void;
    reset: (state: unknown) => void;
    getRootState: () => unknown;
    navigate: (name: string, params?: unknown) => void;
  }> = {}
) {
  return {
    isReady: vi.fn(() => true),
    canGoBack: vi.fn(() => true),
    goBack: vi.fn(),
    reset: vi.fn(),
    navigate: vi.fn(),
    getRootState: vi.fn(() => ({
      index: 0,
      routes: [{ name: 'Home', params: { userId: '123' } }],
    })),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('RNNavigationService', () => {
  let service: RNNavigationService;

  beforeEach(() => {
    service = new RNNavigationService();
    vi.clearAllMocks();
  });

  describe('without navigation ref', () => {
    it('navigate should warn when not ready', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.navigate('Home');
      expect(warnSpy).toHaveBeenCalledWith('Navigation is not ready yet');
      warnSpy.mockRestore();
    });

    it('goBack should warn when not ready', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.goBack();
      expect(warnSpy).toHaveBeenCalledWith('Navigation is not ready yet');
      warnSpy.mockRestore();
    });

    it('replace should warn when not ready', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.replace('Login');
      expect(warnSpy).toHaveBeenCalledWith('Navigation is not ready yet');
      warnSpy.mockRestore();
    });

    it('resetToInitial should warn when not ready', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.resetToInitial('Home');
      expect(warnSpy).toHaveBeenCalledWith('Navigation is not ready yet');
      warnSpy.mockRestore();
    });

    it('getCurrentState should return empty state', () => {
      const state = service.getCurrentState();
      expect(state.currentPath).toBe('');
      expect(state.params).toEqual({});
      expect(state.searchParams).toEqual({});
    });

    it('isSupported should return false', () => {
      expect(service.isSupported()).toBe(false);
    });

    it('canGoBack should return false', () => {
      expect(service.canGoBack()).toBe(false);
    });
  });

  describe('with navigation ref', () => {
    it('should navigate to a screen', () => {
      const ref = createMockNavigationRef();
      service.setNavigationRef(ref);
      service.navigate('EmailDetail', {
        state: { emailId: '123' },
      });
      expect(ref.navigate).toHaveBeenCalledWith('EmailDetail', {
        emailId: '123',
      });
    });

    it('should go back', () => {
      const ref = createMockNavigationRef();
      service.setNavigationRef(ref);
      service.goBack();
      expect(ref.goBack).toHaveBeenCalled();
    });

    it('should navigate to fallback when cannot go back', () => {
      const ref = createMockNavigationRef({
        canGoBack: () => false,
      });
      service.setNavigationRef(ref);
      service.goBack('Home');
      expect(ref.navigate).toHaveBeenCalledWith('Home', undefined);
    });

    it('should replace the current screen', () => {
      const ref = createMockNavigationRef();
      service.setNavigationRef(ref);
      service.replace('Login');
      expect(ref.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Login', params: undefined }],
      });
    });

    it('should get current state', () => {
      const ref = createMockNavigationRef();
      service.setNavigationRef(ref);
      const state = service.getCurrentState();
      expect(state.currentPath).toBe('Home');
      expect(state.params).toEqual({ userId: '123' });
    });

    it('should get current path', () => {
      const ref = createMockNavigationRef();
      service.setNavigationRef(ref);
      expect(service.getCurrentPath()).toBe('Home');
    });

    it('should get empty search params', () => {
      expect(service.getSearchParams()).toEqual({});
    });

    it('should get route params', () => {
      const ref = createMockNavigationRef();
      service.setNavigationRef(ref);
      expect(service.getParams()).toEqual({ userId: '123' });
    });

    it('should report isSupported as true', () => {
      const ref = createMockNavigationRef();
      service.setNavigationRef(ref);
      expect(service.isSupported()).toBe(true);
    });

    it('should report canGoBack correctly', () => {
      const ref = createMockNavigationRef({ canGoBack: () => false });
      service.setNavigationRef(ref);
      expect(service.canGoBack()).toBe(false);
    });

    it('should reset to initial route', () => {
      const ref = createMockNavigationRef();
      service.setNavigationRef(ref);
      service.resetToInitial('Login');
      expect(ref.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    });
  });

  describe('goForward', () => {
    it('should warn that goForward is not supported', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.goForward();
      expect(warnSpy).toHaveBeenCalledWith(
        'goForward is not supported in React Navigation'
      );
      warnSpy.mockRestore();
    });
  });

  describe('canGoForward', () => {
    it('should always return false', () => {
      expect(service.canGoForward()).toBe(false);
    });
  });

  describe('addListener / onStateChange', () => {
    it('should notify listeners on state change', () => {
      const listener = vi.fn();
      service.addListener(listener);

      service.onStateChange({
        index: 0,
        key: 'root',
        routeNames: ['Home', 'Settings'],
        routes: [
          {
            key: 'Home-key',
            name: 'Home',
            params: { tab: 'inbox' },
          },
        ],
        type: 'stack',
        stale: false,
      });

      expect(listener).toHaveBeenCalledWith({
        currentPath: 'Home',
        params: { tab: 'inbox' },
        searchParams: {},
      });
    });

    it('should handle undefined state in onStateChange', () => {
      const listener = vi.fn();
      service.addListener(listener);
      service.onStateChange(undefined);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should remove listener on unsubscribe', () => {
      const listener = vi.fn();
      const unsub = service.addListener(listener);
      unsub();

      service.onStateChange({
        index: 0,
        key: 'root',
        routeNames: ['Home'],
        routes: [{ key: 'Home-key', name: 'Home' }],
        type: 'stack',
        stale: false,
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle nested navigator state', () => {
      const listener = vi.fn();
      service.addListener(listener);

      service.onStateChange({
        index: 0,
        key: 'root',
        routeNames: ['Main'],
        routes: [
          {
            key: 'Main-key',
            name: 'Main',
            state: {
              index: 1,
              key: 'tabs',
              routeNames: ['Inbox', 'Settings'],
              routes: [
                { key: 'Inbox-key', name: 'Inbox' },
                {
                  key: 'Settings-key',
                  name: 'Settings',
                  params: { section: 'account' },
                },
              ],
              type: 'tab',
              stale: false,
            },
          },
        ],
        type: 'stack',
        stale: false,
      });

      expect(listener).toHaveBeenCalledWith({
        currentPath: 'Settings',
        params: { section: 'account' },
        searchParams: {},
      });
    });
  });

  describe('dispose', () => {
    it('should clear listeners and navigation ref', () => {
      const ref = createMockNavigationRef();
      service.setNavigationRef(ref);

      const listener = vi.fn();
      service.addListener(listener);

      service.dispose();

      // After dispose, isSupported should be false (ref is null)
      expect(service.isSupported()).toBe(false);
    });
  });
});

describe('Navigation Singleton Management', () => {
  beforeEach(() => {
    resetNavigationService();
  });

  describe('getNavigationService', () => {
    it('should auto-create service on first call', () => {
      const service = getNavigationService();
      expect(service).toBeInstanceOf(RNNavigationService);
    });

    it('should return the same instance on subsequent calls', () => {
      const s1 = getNavigationService();
      const s2 = getNavigationService();
      expect(s1).toBe(s2);
    });
  });

  describe('initializeNavigationService', () => {
    it('should create a new service', () => {
      const service = initializeNavigationService();
      expect(service).toBeInstanceOf(RNNavigationService);
    });

    it('should accept a custom instance', () => {
      const custom = new RNNavigationService();
      const service = initializeNavigationService(custom);
      expect(service).toBe(custom);
    });

    it('should dispose previous service', () => {
      const first = initializeNavigationService();
      const disposeSpy = vi.spyOn(first, 'dispose');
      initializeNavigationService();
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('resetNavigationService', () => {
    it('should reset singleton to null', () => {
      const first = initializeNavigationService();
      const disposeSpy = vi.spyOn(first, 'dispose');
      resetNavigationService();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should not throw if no service exists', () => {
      expect(() => resetNavigationService()).not.toThrow();
    });
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  RNInfoService,
  createRNInfoService,
  initializeInfoService,
  getInfoService,
  resetInfoService,
} from '../src/info/info.rn.js';

// Import InfoType directly as a value
const InfoType = {
  INFO: 'info' as const,
  SUCCESS: 'success' as const,
  ERROR: 'error' as const,
  WARNING: 'warning' as const,
};

describe('RNInfoService', () => {
  let service: RNInfoService;

  beforeEach(() => {
    service = new RNInfoService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should have isVisible=false by default', () => {
      const state = service.getState();
      expect(state.isVisible).toBe(false);
      expect(state.title).toBe('');
      expect(state.description).toBe('');
    });
  });

  describe('show', () => {
    it('should show a banner with given title and text', () => {
      service.show('Title', 'Description', InfoType.SUCCESS);
      const state = service.getState();
      expect(state.isVisible).toBe(true);
      expect(state.title).toBe('Title');
      expect(state.description).toBe('Description');
      expect(state.variant).toBe(InfoType.SUCCESS);
    });

    it('should auto-dismiss after default 4000ms', () => {
      service.show('Title', 'Text', InfoType.INFO);
      expect(service.getState().isVisible).toBe(true);

      vi.advanceTimersByTime(4000);
      expect(service.getState().isVisible).toBe(false);
    });

    it('should auto-dismiss after custom interval', () => {
      service.show('Title', 'Text', InfoType.INFO, 2000);
      expect(service.getState().isVisible).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(service.getState().isVisible).toBe(false);
    });

    it('should set duration when interval is provided', () => {
      service.show('Title', 'Text', InfoType.INFO, 5000);
      expect(service.getState().duration).toBe(5000);
    });

    it('should replace previous banner', () => {
      service.show('First', 'First text', InfoType.INFO);
      service.show('Second', 'Second text', InfoType.ERROR);

      const state = service.getState();
      expect(state.title).toBe('Second');
      expect(state.description).toBe('Second text');
      expect(state.variant).toBe(InfoType.ERROR);
    });

    it('should clear previous auto-dismiss timer when showing new banner', () => {
      service.show('First', 'Text', InfoType.INFO, 2000);
      vi.advanceTimersByTime(1000);

      service.show('Second', 'Text', InfoType.SUCCESS, 3000);
      // After 2000ms total (1000 already passed), first timer would fire
      vi.advanceTimersByTime(1500);
      // But second banner should still be visible (only 1500ms into its 3000ms timer)
      expect(service.getState().isVisible).toBe(true);
      expect(service.getState().title).toBe('Second');

      // At 3000ms into the second timer, it should dismiss
      vi.advanceTimersByTime(1500);
      expect(service.getState().isVisible).toBe(false);
    });
  });

  describe('dismiss', () => {
    it('should hide the banner', () => {
      service.show('Title', 'Text', InfoType.INFO);
      service.dismiss();
      expect(service.getState().isVisible).toBe(false);
    });

    it('should clear auto-dismiss timeout', () => {
      service.show('Title', 'Text', InfoType.INFO, 5000);
      service.dismiss();

      // Advance past the original auto-dismiss time
      vi.advanceTimersByTime(6000);
      // Should still be dismissed (no double-dismiss or errors)
      expect(service.getState().isVisible).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('should call listener immediately with current state', () => {
      const listener = vi.fn();
      service.subscribe(listener);
      expect(listener).toHaveBeenCalledWith(service.getState());
    });

    it('should notify listeners on state changes', () => {
      const listener = vi.fn();
      service.subscribe(listener);

      service.show('Hello', 'World', InfoType.SUCCESS);

      // Called once on subscribe, once on show
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isVisible: true,
          title: 'Hello',
        })
      );
    });

    it('should stop calling listener after unsubscribe', () => {
      const listener = vi.fn();
      const unsub = service.subscribe(listener);

      unsub();
      service.show('Title', 'Text', InfoType.INFO);

      // Only the initial call from subscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispose', () => {
    it('should clear all listeners', () => {
      const listener = vi.fn();
      service.subscribe(listener);

      service.dispose();
      service.show('Title', 'Text', InfoType.INFO);

      // Only the initial call from subscribe, not the show after dispose
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should clear pending timeout', () => {
      service.show('Title', 'Text', InfoType.INFO, 5000);
      service.dispose();

      // Advance past the auto-dismiss time
      vi.advanceTimersByTime(6000);
      // State should be reset
      expect(service.getState().isVisible).toBe(false);
    });

    it('should reset state', () => {
      service.show('Title', 'Text', InfoType.ERROR);
      service.dispose();
      expect(service.getState().isVisible).toBe(false);
      expect(service.getState().title).toBe('');
    });
  });
});

describe('createRNInfoService', () => {
  it('should create a new instance', () => {
    const service = createRNInfoService();
    expect(service).toBeInstanceOf(RNInfoService);
  });
});

describe('Info Singleton Management', () => {
  beforeEach(() => {
    resetInfoService();
  });

  describe('initializeInfoService', () => {
    it('should create a service when none exists', () => {
      initializeInfoService();
      expect(() => getInfoService()).not.toThrow();
    });

    it('should accept a custom instance', () => {
      const custom = new RNInfoService();
      initializeInfoService(custom);
      expect(getInfoService()).toBe(custom);
    });

    it('should be a no-op if already initialized', () => {
      const first = new RNInfoService();
      initializeInfoService(first);
      initializeInfoService(new RNInfoService());
      expect(getInfoService()).toBe(first);
    });
  });

  describe('getInfoService', () => {
    it('should throw if not initialized', () => {
      expect(() => getInfoService()).toThrow(
        'Info service not initialized. Call initializeInfoService() at app startup.'
      );
    });

    it('should return the initialized service', () => {
      initializeInfoService();
      expect(getInfoService()).toBeInstanceOf(RNInfoService);
    });
  });

  describe('resetInfoService', () => {
    it('should reset singleton so getInfoService throws', () => {
      initializeInfoService();
      resetInfoService();
      expect(() => getInfoService()).toThrow();
    });

    it('should not throw if no service exists', () => {
      expect(() => resetInfoService()).not.toThrow();
    });
  });
});

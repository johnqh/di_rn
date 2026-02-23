import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RNThemeService,
  getThemeService,
  initializeThemeService,
  resetThemeService,
  setAppearanceModule,
} from '../src/theme/theme.rn.js';

// Create mock Appearance API
const mockAppearance = {
  getColorScheme: vi.fn(() => 'light' as const),
  addChangeListener: vi.fn(() => ({ remove: vi.fn() })),
  setColorScheme: vi.fn(),
};

describe('RNThemeService', () => {
  let service: RNThemeService;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setAppearanceModule(mockAppearance as any);
    service = new RNThemeService();
    vi.clearAllMocks();
  });

  describe('getCurrentTheme', () => {
    it('should default to system', () => {
      expect(service.getCurrentTheme()).toBe('system');
    });
  });

  describe('applyTheme', () => {
    it('should set theme to dark', () => {
      service.applyTheme('dark');
      expect(service.getCurrentTheme()).toBe('dark');
    });

    it('should set theme to light', () => {
      service.applyTheme('light');
      expect(service.getCurrentTheme()).toBe('light');
    });

    it('should set theme to system', () => {
      service.applyTheme('dark');
      service.applyTheme('system');
      expect(service.getCurrentTheme()).toBe('system');
    });

    it('should notify listeners on theme change', () => {
      const callback = vi.fn();
      service.watchSystemTheme(callback);
      service.applyTheme('dark');

      expect(callback).toHaveBeenCalledWith('dark');
    });
  });

  describe('getResolvedTheme', () => {
    it('should return "light" when system theme is light', () => {
      mockAppearance.getColorScheme.mockReturnValue('light');
      expect(service.getResolvedTheme()).toBe('light');
    });

    it('should return "dark" when system theme is dark and mode is system', () => {
      mockAppearance.getColorScheme.mockReturnValue('dark');
      expect(service.getResolvedTheme()).toBe('dark');
    });

    it('should return "dark" when explicitly set to dark', () => {
      service.applyTheme('dark');
      expect(service.getResolvedTheme()).toBe('dark');
    });

    it('should return "light" when explicitly set to light', () => {
      service.applyTheme('light');
      expect(service.getResolvedTheme()).toBe('light');
    });

    it('should ignore system theme when explicitly set to light', () => {
      mockAppearance.getColorScheme.mockReturnValue('dark');
      service.applyTheme('light');
      expect(service.getResolvedTheme()).toBe('light');
    });
  });

  describe('getSystemTheme', () => {
    it('should return the system color scheme', () => {
      mockAppearance.getColorScheme.mockReturnValue('light');
      expect(service.getSystemTheme()).toBe('light');
    });

    it('should return dark when system is dark', () => {
      mockAppearance.getColorScheme.mockReturnValue('dark');
      expect(service.getSystemTheme()).toBe('dark');
    });
  });

  describe('isDarkMode', () => {
    it('should return false when theme is light', () => {
      service.applyTheme('light');
      expect(service.isDarkMode()).toBe(false);
    });

    it('should return true when theme is dark', () => {
      service.applyTheme('dark');
      expect(service.isDarkMode()).toBe(true);
    });

    it('should follow system when theme is system and system is dark', () => {
      mockAppearance.getColorScheme.mockReturnValue('dark');
      expect(service.isDarkMode()).toBe(true);
    });
  });

  describe('applyFontSize', () => {
    it('should set font size', () => {
      service.applyFontSize('large');
      expect(service.getCurrentFontSize()).toBe('large');
    });

    it('should default to medium', () => {
      expect(service.getCurrentFontSize()).toBe('medium');
    });
  });

  describe('getFontSizeMultiplier', () => {
    it('should return 0.85 for small', () => {
      service.applyFontSize('small');
      expect(service.getFontSizeMultiplier()).toBe(0.85);
    });

    it('should return 1.0 for medium', () => {
      service.applyFontSize('medium');
      expect(service.getFontSizeMultiplier()).toBe(1.0);
    });

    it('should return 1.15 for large', () => {
      service.applyFontSize('large');
      expect(service.getFontSizeMultiplier()).toBe(1.15);
    });
  });

  describe('watchSystemTheme', () => {
    it('should add a listener and return unsubscribe function', () => {
      const callback = vi.fn();
      const unsub = service.watchSystemTheme(callback);

      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('should stop calling listener after unsubscribe', () => {
      const callback = vi.fn();
      const unsub = service.watchSystemTheme(callback);
      unsub();

      service.applyTheme('dark');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should set up Appearance listener on first subscription', () => {
      const callback = vi.fn();
      service.watchSystemTheme(callback);

      expect(mockAppearance.addChangeListener).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should clear listeners and appearance listener', () => {
      const callback = vi.fn();
      service.watchSystemTheme(callback);

      service.dispose();

      service.applyTheme('dark');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should allow re-initialization after dispose', () => {
      service.watchSystemTheme(vi.fn());
      service.dispose();

      // After dispose, watchSystemTheme should re-initialize
      const callback = vi.fn();
      service.watchSystemTheme(callback);
      service.applyTheme('dark');
      expect(callback).toHaveBeenCalledWith('dark');
    });
  });
});

describe('Theme Singleton Management', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setAppearanceModule(mockAppearance as any);
    resetThemeService();
  });

  describe('getThemeService', () => {
    it('should auto-create service on first call', () => {
      const service = getThemeService();
      expect(service).toBeInstanceOf(RNThemeService);
    });

    it('should return the same instance on subsequent calls', () => {
      const s1 = getThemeService();
      const s2 = getThemeService();
      expect(s1).toBe(s2);
    });
  });

  describe('initializeThemeService', () => {
    it('should create a new service', () => {
      const service = initializeThemeService();
      expect(service).toBeInstanceOf(RNThemeService);
    });

    it('should accept a custom instance', () => {
      const custom = new RNThemeService();
      const service = initializeThemeService(custom);
      expect(service).toBe(custom);
    });

    it('should dispose previous service', () => {
      const first = initializeThemeService();
      const disposeSpy = vi.spyOn(first, 'dispose');
      initializeThemeService();
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('resetThemeService', () => {
    it('should reset singleton to null', () => {
      const first = initializeThemeService();
      const disposeSpy = vi.spyOn(first, 'dispose');
      resetThemeService();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should not throw if no service exists', () => {
      expect(() => resetThemeService()).not.toThrow();
    });
  });
});

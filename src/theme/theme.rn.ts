import type { PlatformTheme } from '@sudobility/di';

// Lazy load Appearance to avoid issues at module load time
type AppearanceType = typeof import('react-native').Appearance;
type ColorSchemeName = import('react-native').ColorSchemeName;
let AppearanceModule: AppearanceType | null = null;

function getAppearance(): AppearanceType | null {
  if (!AppearanceModule) {
    try {
      const RN = require('react-native');
      AppearanceModule = RN.Appearance;
    } catch (e) {
      console.warn('Appearance not available:', e);
    }
  }
  return AppearanceModule;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

/**
 * React Native Theme Service using the Appearance API.
 */
export class RNThemeService implements PlatformTheme {
  private currentTheme: ThemeMode = 'system';
  private currentFontSize: FontSize = 'medium';
  private listeners: Set<(theme: ThemeMode) => void> = new Set();
  private appearanceListener: { remove: () => void } | null = null;
  private initialized: boolean = false;

  constructor() {
    // Defer initialization to avoid native module issues at load time
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.initializeAppearanceListener();
  }

  private initializeAppearanceListener(): void {
    const Appearance = getAppearance();
    if (!Appearance) return;

    this.appearanceListener = Appearance.addChangeListener(() => {
      if (this.currentTheme === 'system') {
        this.notifyListeners();
      }
    });
  }

  private notifyListeners(): void {
    const resolvedTheme = this.getResolvedTheme();
    this.listeners.forEach((listener) => listener(resolvedTheme as ThemeMode));
  }

  /**
   * Apply a theme (light, dark, or system).
   */
  applyTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    this.notifyListeners();
  }

  /**
   * Apply a font size scaling.
   */
  applyFontSize(fontSize: FontSize): void {
    this.currentFontSize = fontSize;
  }

  /**
   * Get the current theme setting.
   */
  getCurrentTheme(): ThemeMode {
    return this.currentTheme;
  }

  /**
   * Get the resolved theme (accounts for system theme if set to 'system').
   */
  getResolvedTheme(): 'light' | 'dark' {
    if (this.currentTheme === 'system') {
      const Appearance = getAppearance();
      const systemTheme = Appearance?.getColorScheme() ?? 'light';
      return systemTheme === 'dark' ? 'dark' : 'light';
    }
    return this.currentTheme;
  }

  /**
   * Get the system's current color scheme.
   */
  getSystemTheme(): ColorSchemeName {
    const Appearance = getAppearance();
    return Appearance?.getColorScheme() ?? 'light';
  }

  /**
   * Get the current font size setting.
   */
  getCurrentFontSize(): FontSize {
    return this.currentFontSize;
  }

  /**
   * Get font size multiplier for the current setting.
   */
  getFontSizeMultiplier(): number {
    switch (this.currentFontSize) {
      case 'small':
        return 0.85;
      case 'large':
        return 1.15;
      default:
        return 1.0;
    }
  }

  /**
   * Watch for system theme changes.
   */
  watchSystemTheme(callback: (theme: ThemeMode) => void): () => void {
    this.ensureInitialized();
    this.listeners.add(callback);

    // Return cleanup function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Check if dark mode is currently active.
   */
  isDarkMode(): boolean {
    return this.getResolvedTheme() === 'dark';
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    if (this.appearanceListener) {
      this.appearanceListener.remove();
      this.appearanceListener = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
let themeService: RNThemeService | null = null;

export function getThemeService(): RNThemeService {
  if (!themeService) {
    themeService = new RNThemeService();
  }
  return themeService;
}

export function initializeThemeService(
  service?: RNThemeService
): RNThemeService {
  if (themeService) {
    themeService.dispose();
  }
  themeService = service ?? new RNThemeService();
  return themeService;
}

export function resetThemeService(): void {
  if (themeService) {
    themeService.dispose();
    themeService = null;
  }
}

export const rnThemeService = new RNThemeService();

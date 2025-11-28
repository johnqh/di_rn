import { Appearance, ColorSchemeName } from 'react-native';
import type { PlatformTheme } from '@sudobility/di';

export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

/**
 * React Native Theme Service using the Appearance API.
 */
export class RNThemeService implements PlatformTheme {
  private currentTheme: ThemeMode = 'system';
  private currentFontSize: FontSize = 'medium';
  private listeners: Set<(theme: ThemeMode) => void> = new Set();
  private appearanceListener: ReturnType<
    typeof Appearance.addChangeListener
  > | null = null;

  constructor() {
    this.initializeAppearanceListener();
  }

  private initializeAppearanceListener(): void {
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
      const systemTheme = Appearance.getColorScheme();
      return systemTheme === 'dark' ? 'dark' : 'light';
    }
    return this.currentTheme;
  }

  /**
   * Get the system's current color scheme.
   */
  getSystemTheme(): ColorSchemeName {
    return Appearance.getColorScheme();
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

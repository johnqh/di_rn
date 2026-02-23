import type { PlatformTheme } from '@sudobility/di/interfaces';

// Lazy load Appearance to avoid issues at module load time
type AppearanceType = typeof import('react-native').Appearance;
type ColorSchemeName = import('react-native').ColorSchemeName;
let AppearanceModule: AppearanceType | null = null;
let AppearanceOverride: AppearanceType | null = null;

/**
 * Inject a mock or custom Appearance module for testing.
 *
 * @param appearance - The Appearance API to use, or `null` to reset and use the real module.
 *
 * @example
 * ```ts
 * // In tests:
 * setAppearanceModule(mockAppearance);
 * ```
 */
export function setAppearanceModule(appearance: AppearanceType | null): void {
  AppearanceOverride = appearance;
  AppearanceModule = null; // Reset cached module so override takes effect
}

/**
 * Lazily load and return the React Native Appearance API.
 *
 * Uses `require()` inside a try-catch to avoid crashes when React Native
 * is not available (e.g., in test environments without native modules).
 * The module is cached after the first successful load.
 *
 * @returns The Appearance module, or `null` if not available.
 */
function getAppearance(): AppearanceType | null {
  if (AppearanceOverride) return AppearanceOverride;

  if (!AppearanceModule) {
    try {
      const RN: { Appearance: AppearanceType } = require('react-native');
      AppearanceModule = RN.Appearance;
    } catch (e) {
      console.warn('Appearance not available:', e);
    }
  }
  return AppearanceModule;
}

/** Theme mode: explicit light/dark or system-follow. */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Font size scaling preference. */
export type FontSize = 'small' | 'medium' | 'large';

/**
 * React Native Theme Service using the Appearance API.
 *
 * Implements `PlatformTheme` from `@sudobility/di/interfaces`.
 * Supports light, dark, and system-follow theme modes, as well as
 * font size scaling (small/medium/large).
 *
 * Initialization of the Appearance listener is deferred until first
 * subscription via `ensureInitialized()` to avoid native module issues
 * at import time.
 *
 * @example
 * ```ts
 * const theme = new RNThemeService();
 * theme.applyTheme('dark');
 * console.log(theme.isDarkMode()); // true
 *
 * const unsub = theme.watchSystemTheme((mode) => {
 *   console.log('Theme changed to:', mode);
 * });
 * ```
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
   * Apply a theme mode (light, dark, or system).
   *
   * @param theme - The theme mode to apply.
   *
   * @example
   * ```ts
   * themeService.applyTheme('dark');
   * ```
   */
  applyTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    this.notifyListeners();
  }

  /**
   * Apply a font size scaling preference.
   *
   * @param fontSize - The font size to apply (`'small'`, `'medium'`, or `'large'`).
   *
   * @example
   * ```ts
   * themeService.applyFontSize('large');
   * ```
   */
  applyFontSize(fontSize: FontSize): void {
    this.currentFontSize = fontSize;
  }

  /**
   * Get the current theme setting (may be `'system'`).
   *
   * @returns The current `ThemeMode`.
   */
  getCurrentTheme(): ThemeMode {
    return this.currentTheme;
  }

  /**
   * Get the resolved theme, accounting for system theme when mode is `'system'`.
   *
   * @returns `'light'` or `'dark'`.
   *
   * @example
   * ```ts
   * const resolved = themeService.getResolvedTheme(); // 'light' or 'dark'
   * ```
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
   *
   * @returns The system color scheme name, or `'light'` if unavailable.
   */
  getSystemTheme(): ColorSchemeName {
    const Appearance = getAppearance();
    return Appearance?.getColorScheme() ?? 'light';
  }

  /**
   * Get the current font size setting.
   *
   * @returns The current `FontSize`.
   */
  getCurrentFontSize(): FontSize {
    return this.currentFontSize;
  }

  /**
   * Get the font size multiplier for the current setting.
   *
   * @returns A numeric multiplier: 0.85 for small, 1.0 for medium, 1.15 for large.
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
   *
   * Triggers deferred initialization on first call.
   *
   * @param callback - Function invoked with the resolved theme mode on changes.
   * @returns An unsubscribe function to remove the listener.
   *
   * @example
   * ```ts
   * const unsub = themeService.watchSystemTheme((mode) => {
   *   console.log('Theme:', mode);
   * });
   * // Later: unsub();
   * ```
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
   *
   * @returns `true` if the resolved theme is `'dark'`.
   */
  isDarkMode(): boolean {
    return this.getResolvedTheme() === 'dark';
  }

  /**
   * Cleanup resources: remove the native Appearance listener and clear subscribers.
   */
  dispose(): void {
    if (this.appearanceListener) {
      this.appearanceListener.remove();
      this.appearanceListener = null;
    }
    this.listeners.clear();
    this.initialized = false;
  }
}

// Singleton instance
let themeService: RNThemeService | null = null;

/**
 * Get the theme service singleton, auto-creating one if not yet initialized.
 *
 * @returns The `RNThemeService` singleton instance.
 *
 * @example
 * ```ts
 * const theme = getThemeService();
 * console.log(theme.isDarkMode());
 * ```
 */
export function getThemeService(): RNThemeService {
  if (!themeService) {
    themeService = new RNThemeService();
  }
  return themeService;
}

/**
 * Initialize the theme service singleton, optionally injecting a custom instance.
 *
 * If a previous singleton exists, it is disposed before replacement.
 *
 * @param service - Optional custom `RNThemeService` instance. If omitted, a new one is created.
 * @returns The initialized `RNThemeService` singleton.
 *
 * @example
 * ```ts
 * initializeThemeService();
 * ```
 */
export function initializeThemeService(
  service?: RNThemeService
): RNThemeService {
  if (themeService) {
    themeService.dispose();
  }
  themeService = service ?? new RNThemeService();
  return themeService;
}

/**
 * Reset the theme service singleton to `null`.
 *
 * Disposes the current instance if one exists, removing native Appearance listeners.
 *
 * @example
 * ```ts
 * resetThemeService();
 * ```
 */
export function resetThemeService(): void {
  if (themeService) {
    themeService.dispose();
    themeService = null;
  }
}

export const rnThemeService = new RNThemeService();

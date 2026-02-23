import type {
  NavigationContainerRef,
  NavigationState as RNNavigationState,
} from '@react-navigation/native';
import type {
  NavigationService,
  NavigationState,
  NavigationOptions,
} from '@sudobility/di/interfaces';
import type { Optional } from '@sudobility/types';

/**
 * React Native Navigation Service using React Navigation.
 *
 * Wraps React Navigation's imperative API to implement `NavigationService`
 * from `@sudobility/di/interfaces`. Supports nested navigators, state
 * change listeners, and go-back with fallback.
 *
 * The navigation ref must be set externally by calling `setNavigationRef()`
 * from your app's `NavigationContainer`.
 *
 * @example
 * ```tsx
 * // In App.tsx:
 * <NavigationContainer
 *   ref={navigationRef}
 *   onReady={() => rnNavigationService.setNavigationRef(navigationRef)}
 *   onStateChange={(state) => rnNavigationService.onStateChange(state)}
 * />
 *
 * // Anywhere in the app:
 * rnNavigationService.navigate('EmailDetail', { state: { emailId: '123' } });
 * ```
 */
export class RNNavigationService implements NavigationService {
  private navigationRef: NavigationContainerRef<
    Record<string, unknown>
  > | null = null;
  private listeners: Set<(state: NavigationState) => void> = new Set();

  /**
   * Set the navigation container ref.
   * This should be called from App.tsx with the NavigationContainer's ref.
   *
   * @param ref - The React Navigation container ref.
   *
   * @example
   * ```tsx
   * <NavigationContainer
   *   ref={navigationRef}
   *   onReady={() => service.setNavigationRef(navigationRef)}
   * />
   * ```
   */
  setNavigationRef(ref: NavigationContainerRef<Record<string, unknown>>): void {
    this.navigationRef = ref;
  }

  /**
   * Navigate to a screen by name.
   *
   * @param path - The screen name / route to navigate to.
   * @param options - Optional navigation options; `options.state` is passed as route params.
   *
   * @example
   * ```ts
   * service.navigate('EmailDetail', { state: { emailId: '123' } });
   * ```
   */
  navigate(path: string, options?: Optional<NavigationOptions>): void {
    if (!this.navigationRef?.isReady()) {
      console.warn('Navigation is not ready yet');
      return;
    }

    const params = options?.state as Record<string, unknown> | undefined;
    (
      this.navigationRef as unknown as {
        navigate: (name: string, params?: Record<string, unknown>) => void;
      }
    ).navigate(path, params);
  }

  /**
   * Go back to the previous screen, or navigate to a fallback if at root.
   *
   * @param fallbackPath - Optional route name to navigate to if back is not possible.
   *
   * @example
   * ```ts
   * service.goBack('Home'); // go back, or navigate to 'Home' if at root
   * ```
   */
  goBack(fallbackPath?: Optional<string>): void {
    if (!this.navigationRef?.isReady()) {
      console.warn('Navigation is not ready yet');
      return;
    }

    if (this.navigationRef.canGoBack()) {
      this.navigationRef.goBack();
    } else if (fallbackPath) {
      this.navigate(fallbackPath);
    }
  }

  /**
   * Go forward -- not supported in React Navigation.
   *
   * Logs a warning since mobile navigation does not have a forward concept.
   */
  goForward(): void {
    // Not supported in React Navigation
    console.warn('goForward is not supported in React Navigation');
  }

  /**
   * Replace the current screen with a new one (resets the navigation stack).
   *
   * @param path - The screen name to navigate to.
   * @param options - Optional navigation options; `options.state` is passed as route params.
   *
   * @example
   * ```ts
   * service.replace('Login'); // reset stack to Login screen
   * ```
   */
  replace(path: string, options?: Optional<NavigationOptions>): void {
    if (!this.navigationRef?.isReady()) {
      console.warn('Navigation is not ready yet');
      return;
    }

    const params = options?.state as Record<string, unknown> | undefined;
    this.navigationRef.reset({
      index: 0,
      routes: [{ name: path, params }],
    });
  }

  /**
   * Get the current navigation state.
   *
   * @returns A `NavigationState` object with the current path, params, and search params.
   */
  getCurrentState(): NavigationState {
    if (!this.navigationRef?.isReady()) {
      return {
        currentPath: '',
        params: {},
        searchParams: {},
      };
    }

    const state = this.navigationRef.getRootState();
    const currentRoute = this.getCurrentRouteName(state);
    const routeParams = this.getCurrentRouteParams(state);

    return {
      currentPath: currentRoute ?? '',
      params: routeParams,
      searchParams: {},
    };
  }

  /**
   * Get the current route path (screen name).
   *
   * @returns The current route name, or `''` if navigation is not ready.
   */
  getCurrentPath(): string {
    return this.getCurrentState().currentPath;
  }

  /**
   * Get current search params (not typically used in React Native).
   *
   * @returns An empty record (search params are a web concept).
   */
  getSearchParams(): Record<string, string> {
    return {};
  }

  /**
   * Get current route params as string key-value pairs.
   *
   * @returns A record of route parameter strings.
   */
  getParams(): Record<string, string> {
    return this.getCurrentState().params;
  }

  /**
   * Get the current route name from navigation state, handling nested navigators.
   */
  private getCurrentRouteName(
    state: RNNavigationState | undefined
  ): Optional<string> {
    if (!state || !state.routes.length) return null;

    const index = state.index ?? 0;
    const route = state.routes[index];

    if (!route) return null;

    // Handle nested navigators
    if (route.state) {
      return this.getCurrentRouteName(route.state as RNNavigationState);
    }

    return route.name;
  }

  /**
   * Get params from current route, handling nested navigators.
   */
  private getCurrentRouteParams(
    state: RNNavigationState | undefined
  ): Record<string, string> {
    if (!state || !state.routes.length) return {};

    const index = state.index ?? 0;
    const route = state.routes[index];

    if (!route) return {};

    // Handle nested navigators
    if (route.state) {
      return this.getCurrentRouteParams(route.state as RNNavigationState);
    }

    const params = route.params as Record<string, unknown> | undefined;
    if (!params) return {};

    // Convert params to string values
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        result[key] = String(value);
      }
    }
    return result;
  }

  /**
   * Add a listener for navigation state changes.
   *
   * @param listener - Function invoked with the new `NavigationState` on each change.
   * @returns An unsubscribe function to remove the listener.
   *
   * @example
   * ```ts
   * const unsub = service.addListener((state) => {
   *   console.log('Current screen:', state.currentPath);
   * });
   * ```
   */
  addListener(listener: (state: NavigationState) => void): () => void {
    this.listeners.add(listener);

    // Return cleanup function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify listeners of navigation state changes.
   * This should be called from NavigationContainer's `onStateChange` prop.
   *
   * @param state - The new React Navigation state (from `onStateChange`).
   *
   * @example
   * ```tsx
   * <NavigationContainer
   *   onStateChange={(state) => service.onStateChange(state)}
   * />
   * ```
   */
  onStateChange(state: RNNavigationState | undefined): void {
    if (!state) return;

    const currentRoute = this.getCurrentRouteName(state);
    const routeParams = this.getCurrentRouteParams(state);

    const navState: NavigationState = {
      currentPath: currentRoute ?? '',
      params: routeParams,
      searchParams: {},
    };

    this.listeners.forEach((listener) => listener(navState));
  }

  /**
   * Check if the navigation service is ready (ref is set and navigator is ready).
   *
   * @returns `true` if navigation is available and ready.
   */
  isSupported(): boolean {
    return this.navigationRef?.isReady() ?? false;
  }

  /**
   * Check if the navigator can go back.
   *
   * @returns `true` if the navigator has a previous screen in the stack.
   */
  canGoBack(): boolean {
    return this.navigationRef?.canGoBack() ?? false;
  }

  /**
   * Check if the navigator can go forward (always `false` in React Native).
   *
   * @returns Always `false` -- forward navigation is not supported.
   */
  canGoForward(): boolean {
    return false;
  }

  /**
   * Reset navigation stack to an initial route.
   *
   * @param initialRoute - The screen name to reset to.
   *
   * @example
   * ```ts
   * service.resetToInitial('Home');
   * ```
   */
  resetToInitial(initialRoute: string): void {
    if (!this.navigationRef?.isReady()) {
      console.warn('Navigation is not ready yet');
      return;
    }

    this.navigationRef.reset({
      index: 0,
      routes: [{ name: initialRoute }],
    });
  }

  /**
   * Dispose of the navigation service.
   *
   * Clears all state change listeners and releases the navigation ref.
   */
  dispose(): void {
    this.listeners.clear();
    this.navigationRef = null;
  }
}

// Singleton instance
let navigationService: RNNavigationService | null = null;

/**
 * Get the navigation service singleton, auto-creating one if not yet initialized.
 *
 * @returns The `RNNavigationService` singleton instance.
 *
 * @example
 * ```ts
 * const nav = getNavigationService();
 * nav.navigate('Settings');
 * ```
 */
export function getNavigationService(): RNNavigationService {
  if (!navigationService) {
    navigationService = new RNNavigationService();
  }
  return navigationService;
}

/**
 * Initialize the navigation service singleton, optionally injecting a custom instance.
 *
 * @param service - Optional custom `RNNavigationService` instance. If omitted, a new one is created.
 * @returns The initialized `RNNavigationService` singleton.
 *
 * @example
 * ```ts
 * initializeNavigationService();
 * ```
 */
export function initializeNavigationService(
  service?: RNNavigationService
): RNNavigationService {
  if (navigationService) {
    navigationService.dispose();
  }
  navigationService = service ?? new RNNavigationService();
  return navigationService;
}

/**
 * Reset the navigation service singleton to `null`.
 *
 * Disposes the current instance if one exists, clearing listeners and the navigation ref.
 *
 * @example
 * ```ts
 * resetNavigationService();
 * ```
 */
export function resetNavigationService(): void {
  if (navigationService) {
    navigationService.dispose();
    navigationService = null;
  }
}

export const rnNavigationService = new RNNavigationService();

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
 * Wraps React Navigation's imperative API.
 */
export class RNNavigationService implements NavigationService {
  private navigationRef: NavigationContainerRef<
    Record<string, unknown>
  > | null = null;
  private listeners: Set<(state: NavigationState) => void> = new Set();

  /**
   * Set the navigation container ref.
   * This should be called from App.tsx with the NavigationContainer's ref.
   */
  setNavigationRef(ref: NavigationContainerRef<Record<string, unknown>>): void {
    this.navigationRef = ref;
  }

  /**
   * Navigate to a screen.
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
   * Go back to the previous screen.
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
   * Go forward (not typically supported in mobile navigation).
   */
  goForward(): void {
    // Not supported in React Navigation
    console.warn('goForward is not supported in React Navigation');
  }

  /**
   * Replace the current screen.
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
   * Get the current path.
   */
  getCurrentPath(): string {
    return this.getCurrentState().currentPath;
  }

  /**
   * Get current search params (not typically used in RN).
   */
  getSearchParams(): Record<string, string> {
    return {};
  }

  /**
   * Get current route params.
   */
  getParams(): Record<string, string> {
    return this.getCurrentState().params;
  }

  /**
   * Get the current route name from navigation state.
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
   * Get params from current route.
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
   */
  addListener(listener: (state: NavigationState) => void): () => void {
    this.listeners.add(listener);

    // Return cleanup function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify listeners of state changes.
   * This should be called from NavigationContainer's onStateChange prop.
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
   * Check if navigation service is supported/ready.
   */
  isSupported(): boolean {
    return this.navigationRef?.isReady() ?? false;
  }

  /**
   * Check if we can go back.
   */
  canGoBack(): boolean {
    return this.navigationRef?.canGoBack() ?? false;
  }

  /**
   * Check if we can go forward (always false in RN).
   */
  canGoForward(): boolean {
    return false;
  }

  /**
   * Reset navigation to initial state.
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
}

// Singleton instance
let navigationService: RNNavigationService | null = null;

export function getNavigationService(): RNNavigationService {
  if (!navigationService) {
    navigationService = new RNNavigationService();
  }
  return navigationService;
}

export function initializeNavigationService(
  service?: RNNavigationService
): RNNavigationService {
  navigationService = service ?? new RNNavigationService();
  return navigationService;
}

export function resetNavigationService(): void {
  navigationService = null;
}

export const rnNavigationService = new RNNavigationService();

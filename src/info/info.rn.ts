/**
 * React Native implementation of InfoInterface using Banner from @sudobility/components-rn
 *
 * This service manages its own banner state internally and provides
 * a hook for React components to subscribe to state changes.
 *
 * @ai-context RN InfoInterface implementation using Banner component
 * @ai-pattern Singleton service with React subscription
 * @ai-usage Use singleton and render InfoBanner component in app root
 *
 * @example
 * ```tsx
 * // In your app root component:
 * import { InfoBanner } from '@sudobility/di_rn';
 * import { initializeInfoService, RNInfoService } from '@sudobility/di_rn';
 *
 * // Initialize once at app startup
 * initializeInfoService(new RNInfoService());
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <InfoBanner />
 *     </>
 *   );
 * }
 *
 * // Anywhere in your app, use the DI singleton:
 * import { getInfoService } from '@sudobility/di';
 * getInfoService().show('Success', 'Data saved', InfoType.SUCCESS);
 * ```
 */

import {
  type InfoInterface,
  initializeInfoService as initializeDiInfoService,
} from '@sudobility/di/interfaces';
import { InfoType, type Optional } from '@sudobility/types';

/**
 * Banner state managed by the service
 */
export interface BannerState {
  isVisible: boolean;
  title: string;
  description: string;
  variant: InfoType;
  duration?: number;
}

/**
 * Listener function type for state changes
 */
export type BannerStateListener = (state: BannerState) => void;

/**
 * React Native implementation of InfoInterface.
 *
 * Manages banner state internally and notifies subscribers of changes.
 * Supports auto-dismiss with configurable duration.
 *
 * @ai-pattern Observable service pattern for React integration
 *
 * @example
 * ```ts
 * const service = new RNInfoService();
 * const unsub = service.subscribe((state) => {
 *   console.log('Banner visible:', state.isVisible, state.title);
 * });
 * service.show('Saved', 'Your data was saved', InfoType.SUCCESS);
 * // Auto-dismissed after 4000ms by default
 * ```
 */
export class RNInfoService implements InfoInterface {
  private state: BannerState = {
    isVisible: false,
    title: '',
    description: '',
    variant: InfoType.INFO,
  };

  private listeners: Set<BannerStateListener> = new Set();
  private dismissTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Subscribe to banner state changes.
   *
   * The listener is immediately called with the current state upon subscription.
   *
   * @param listener - Function invoked with the current `BannerState` on each change.
   * @returns An unsubscribe function to remove the listener.
   *
   * @example
   * ```ts
   * const unsub = service.subscribe((state) => {
   *   console.log(state.isVisible, state.title);
   * });
   * // Later: unsub();
   * ```
   */
  subscribe(listener: BannerStateListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get the current banner state.
   *
   * @returns The current `BannerState`.
   */
  getState(): BannerState {
    return this.state;
  }

  /**
   * Dismiss the current banner immediately.
   *
   * Clears any pending auto-dismiss timeout.
   */
  dismiss(): void {
    this.clearDismissTimeout();
    this.setState({
      ...this.state,
      isVisible: false,
    });
  }

  /**
   * Show an information banner to the user.
   *
   * @param title - The banner title.
   * @param text - The banner description text.
   * @param type - The banner type (`InfoType.SUCCESS`, `InfoType.ERROR`, etc.).
   * @param interval - Optional auto-dismiss duration in milliseconds. Defaults to 4000ms.
   *   Pass `0` or a negative value to disable auto-dismiss.
   *
   * @example
   * ```ts
   * service.show('Success', 'Item saved', InfoType.SUCCESS);
   * service.show('Error', 'Failed to load', InfoType.ERROR, 6000);
   * ```
   */
  show(
    title: string,
    text: string,
    type: InfoType,
    interval?: Optional<number>
  ): void {
    this.clearDismissTimeout();

    const newState: BannerState = {
      isVisible: true,
      title,
      description: text,
      variant: type,
    };

    if (interval != null) {
      newState.duration = interval;
    }

    this.setState(newState);

    // Auto-dismiss after duration (default 4000ms for RN)
    const dismissAfter = interval ?? 4000;
    if (dismissAfter > 0) {
      this.dismissTimeoutId = setTimeout(() => {
        this.dismiss();
      }, dismissAfter);
    }
  }

  /**
   * Dispose of the info service.
   *
   * Clears any pending auto-dismiss timeout and removes all listeners.
   */
  dispose(): void {
    this.clearDismissTimeout();
    this.listeners.clear();
    this.state = {
      isVisible: false,
      title: '',
      description: '',
      variant: InfoType.INFO,
    };
  }

  private setState(newState: BannerState): void {
    this.state = newState;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  private clearDismissTimeout(): void {
    if (this.dismissTimeoutId) {
      clearTimeout(this.dismissTimeoutId);
      this.dismissTimeoutId = null;
    }
  }
}

/**
 * Create a new `RNInfoService` instance.
 *
 * @returns A new `RNInfoService`.
 *
 * @example
 * ```ts
 * const service = createRNInfoService();
 * ```
 */
export function createRNInfoService(): RNInfoService {
  return new RNInfoService();
}

// Singleton instance
let infoServiceInstance: RNInfoService | null = null;

/**
 * Initialize the info service singleton.
 *
 * Also registers with `@sudobility/di` so `getInfoService()` works from both packages.
 * If already initialized, this call is a no-op.
 *
 * @param service - Optional `RNInfoService` instance. If omitted, a new one is created.
 *
 * @example
 * ```ts
 * initializeInfoService(); // at app startup
 * ```
 */
export function initializeInfoService(service?: RNInfoService): void {
  if (infoServiceInstance) {
    return;
  }
  infoServiceInstance = service ?? new RNInfoService();
  // Also register with @sudobility/di so getInfoService() from that package works
  initializeDiInfoService(infoServiceInstance);
}

/**
 * Get the info service singleton.
 *
 * @returns The initialized `RNInfoService`.
 * @throws Error if the service has not been initialized via `initializeInfoService()`.
 *
 * @example
 * ```ts
 * const info = getInfoService();
 * info.show('Title', 'Message', InfoType.INFO);
 * ```
 */
export function getInfoService(): RNInfoService {
  if (!infoServiceInstance) {
    throw new Error(
      'Info service not initialized. Call initializeInfoService() at app startup.'
    );
  }
  return infoServiceInstance;
}

/**
 * Reset the info service singleton to `null`.
 *
 * Disposes the current instance if one exists.
 *
 * @example
 * ```ts
 * resetInfoService(); // for testing teardown
 * ```
 */
export function resetInfoService(): void {
  if (infoServiceInstance) {
    infoServiceInstance.dispose();
  }
  infoServiceInstance = null;
}

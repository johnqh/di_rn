/**
 * React Native components for InfoInterface integration using react-native-toast-message
 *
 * Provides useInfoBanner hook and InfoBanner component that
 * automatically subscribe to the RNInfoService singleton.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getInfoService,
  mapInfoTypeToToastType,
  type BannerState,
} from './info.rn.js';

// Lazy-load react-native-toast-message
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToastType = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToastConfig = any;

let Toast: ToastType | null = null;

function getToast(): ToastType | null {
  if (!Toast) {
    try {
      const toastModule = require('react-native-toast-message');
      Toast = toastModule.default ?? toastModule;
    } catch {
      console.warn(
        '[di_rn] react-native-toast-message not available. InfoBanner will not work.'
      );
    }
  }
  return Toast;
}

/**
 * Hook to subscribe to the info service banner state
 *
 * @returns Current banner state and dismiss function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, dismiss } = useInfoBanner();
 *
 *   // Custom handling of state if needed
 *   useEffect(() => {
 *     if (state.isVisible) {
 *       console.log('Toast visible:', state.title);
 *     }
 *   }, [state]);
 *
 *   return null;
 * }
 * ```
 */
export function useInfoBanner(): {
  state: BannerState;
  dismiss: () => void;
} {
  const service = getInfoService();
  const [state, setState] = useState<BannerState>(service.getState());

  useEffect(() => {
    return service.subscribe(setState);
  }, [service]);

  const dismiss = useCallback(() => {
    service.dismiss();
  }, [service]);

  return { state, dismiss };
}

/**
 * Props for the InfoBanner component
 */
export interface InfoBannerProps {
  /** Custom toast configuration */
  toastConfig?: ToastConfig;
  /** Position of the toast (default: 'top') */
  position?: 'top' | 'bottom';
  /** Top offset in pixels (default: 50) */
  topOffset?: number;
  /** Bottom offset in pixels */
  bottomOffset?: number;
  /** Visibility duration in ms (default: handled by service) */
  visibilityTime?: number;
}

/**
 * InfoBanner component that automatically connects to the info service singleton
 * and uses react-native-toast-message for display.
 *
 * Render this component once in your app root to display info banners.
 *
 * @example
 * ```tsx
 * import { SafeAreaProvider } from 'react-native-safe-area-context';
 * import { InfoBanner } from '@sudobility/di_rn';
 *
 * function App() {
 *   return (
 *     <SafeAreaProvider>
 *       <NavigationContainer>
 *         <AppContent />
 *       </NavigationContainer>
 *       <InfoBanner position="top" topOffset={50} />
 *     </SafeAreaProvider>
 *   );
 * }
 * ```
 */
export function InfoBanner({
  toastConfig,
  position = 'top',
  topOffset = 50,
  bottomOffset,
  visibilityTime,
}: InfoBannerProps): React.ReactElement | null {
  const { state } = useInfoBanner();
  const lastShownStateRef = useRef<BannerState | null>(null);
  const ToastComponent = getToast();

  useEffect(() => {
    if (!ToastComponent) {
      return;
    }

    // Only show if state changed and is now visible
    if (
      state.isVisible &&
      (!lastShownStateRef.current ||
        lastShownStateRef.current.title !== state.title ||
        lastShownStateRef.current.description !== state.description ||
        lastShownStateRef.current.variant !== state.variant)
    ) {
      lastShownStateRef.current = state;

      ToastComponent.show({
        type: mapInfoTypeToToastType(state.variant),
        text1: state.title,
        text2: state.description,
        position,
        topOffset,
        bottomOffset,
        visibilityTime: visibilityTime ?? state.duration ?? 4000,
      });
    } else if (!state.isVisible && lastShownStateRef.current?.isVisible) {
      lastShownStateRef.current = state;
      ToastComponent.hide();
    }
  }, [
    state,
    ToastComponent,
    position,
    topOffset,
    bottomOffset,
    visibilityTime,
  ]);

  if (!ToastComponent) {
    return null;
  }

  // Render the Toast component
  return <ToastComponent config={toastConfig} />;
}

export type { BannerState } from './info.rn.js';

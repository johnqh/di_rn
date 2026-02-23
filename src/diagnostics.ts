/**
 * @fileoverview Diagnostic utilities for checking native module availability.
 *
 * Provides a `checkNativeModules()` function that reports which optional
 * native modules are available in the current React Native environment.
 * Useful for debugging startup issues and verifying correct linking.
 */

/**
 * Result of a native module availability check.
 */
export interface NativeModuleStatus {
  /** Module name (npm package). */
  name: string;
  /** Whether the module is available (can be required). */
  available: boolean;
  /** Error message if the module is not available. */
  error?: string;
}

/**
 * Report of all native module availability checks.
 */
export interface NativeModuleDiagnostics {
  /** Individual module statuses. */
  modules: NativeModuleStatus[];
  /** Total number of available modules. */
  availableCount: number;
  /** Total number of unavailable modules. */
  unavailableCount: number;
  /** Summary string suitable for logging. */
  summary: string;
}

/**
 * Native modules checked by this diagnostic.
 */
const NATIVE_MODULES = [
  {
    name: '@react-native-async-storage/async-storage',
    description: 'AsyncStorage (RNStorage, AdvancedRNStorage)',
  },
  {
    name: '@react-native-community/netinfo',
    description: 'NetInfo (RNNetworkService)',
  },
  {
    name: '@notifee/react-native',
    description: 'Notifee (RNNotificationService)',
  },
  {
    name: 'react-native',
    description: 'React Native core (Appearance API for RNThemeService)',
  },
  {
    name: 'react-native-config',
    description: 'Config (RNEnvProvider)',
  },
  {
    name: '@react-native-firebase/analytics',
    description: 'Firebase Analytics (RNFirebaseAnalyticsService)',
  },
] as const;

/**
 * Check which native modules are available in the current environment.
 *
 * Iterates over all native modules used by `@sudobility/di_rn` and attempts
 * to `require()` each one, reporting which are available and which are missing.
 *
 * This is useful for:
 * - Debugging app startup issues caused by missing native modules
 * - Verifying correct auto-linking after installing native dependencies
 * - CI/CD checks to ensure all required modules are linked
 *
 * @returns A `NativeModuleDiagnostics` object with availability details.
 *
 * @example
 * ```ts
 * import { checkNativeModules } from '@sudobility/di_rn';
 *
 * const diagnostics = checkNativeModules();
 * console.log(diagnostics.summary);
 * // "Native modules: 5/6 available. Missing: @notifee/react-native"
 *
 * for (const mod of diagnostics.modules) {
 *   if (!mod.available) {
 *     console.warn(`Missing: ${mod.name} - ${mod.error}`);
 *   }
 * }
 * ```
 */
export function checkNativeModules(): NativeModuleDiagnostics {
  const modules: NativeModuleStatus[] = NATIVE_MODULES.map((mod) => {
    try {
      require(mod.name);
      return {
        name: mod.name,
        available: true,
      };
    } catch (e) {
      return {
        name: mod.name,
        available: false,
        error:
          e instanceof Error
            ? e.message
            : `Failed to load ${mod.name}: ${String(e)}`,
      };
    }
  });

  const availableCount = modules.filter((m) => m.available).length;
  const unavailableCount = modules.filter((m) => !m.available).length;
  const missingNames = modules
    .filter((m) => !m.available)
    .map((m) => m.name)
    .join(', ');

  const summary =
    unavailableCount === 0
      ? `Native modules: ${availableCount}/${modules.length} available. All modules linked.`
      : `Native modules: ${availableCount}/${modules.length} available. Missing: ${missingNames}`;

  return {
    modules,
    availableCount,
    unavailableCount,
    summary,
  };
}

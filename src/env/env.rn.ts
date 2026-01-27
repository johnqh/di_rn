import type {
  EnvProvider,
  AppConfig,
  EnvironmentVariables,
  FirebaseConfig,
} from '@sudobility/di/interfaces';
import type { Optional } from '@sudobility/types';
// Lazily load react-native-config so the package can still be imported,
// but fail loudly if the native module is missing. The app depends on it.
let Config: Record<string, string | undefined> = {};
try {
  // Prefer default export but support both shapes.

  const maybeConfig = require('react-native-config');
  Config = (maybeConfig?.default ?? maybeConfig ?? {}) as Record<
    string,
    string | undefined
  >;
} catch (error) {
  throw new Error(
    `[di_rn] react-native-config not available; cannot initialize env provider: ${error}`
  );
}

/**
 * React Native environment provider using react-native-config.
 * Environment variables are defined in .env files and accessed via Config.
 */
export class RNEnvProvider implements EnvProvider {
  get<K extends keyof EnvironmentVariables>(
    key: K,
    defaultValue?: Optional<string>
  ): Optional<EnvironmentVariables[K] | string> {
    const value = Config[key as string];
    return (value ?? defaultValue ?? null) as Optional<
      EnvironmentVariables[K] | string
    >;
  }

  getAll(): EnvironmentVariables {
    return Config as unknown as EnvironmentVariables;
  }

  isDevelopment(): boolean {
    // __DEV__ is a React Native global
    return typeof __DEV__ !== 'undefined' && __DEV__ === true;
  }

  isProduction(): boolean {
    return !this.isDevelopment();
  }

  isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }
}

/**
 * Create AppConfig from environment variables.
 */
export function createRNAppConfig(envProvider: RNEnvProvider): AppConfig {
  return {
    wildDuckBackendUrl:
      (envProvider.get('VITE_WILDDUCK_URL') as string | undefined) ??
      'https://wildduck.0xmail.box',
    indexerBackendUrl:
      (envProvider.get('VITE_INDEXER_URL') as string | undefined) ??
      'https://indexer.0xmail.box',
    walletConnectProjectId:
      (envProvider.get('VITE_WALLETCONNECT_PROJECT_ID') as
        | string
        | undefined) ?? '',
    revenueCatApiKey:
      (envProvider.get('VITE_REVENUECAT_API_KEY') as string | undefined) ?? '',
    privyAppId:
      (envProvider.get('VITE_PRIVY_APP_ID') as string | undefined) ?? '',
    firebase: createFirebaseConfig(envProvider),
    useCloudflareWorker: false,
    cloudflareWorkerUrl: '',
    useMockFallback: envProvider.get('VITE_MOCK_DATA') === 'true',
  };
}

/**
 * Create Firebase configuration from environment variables.
 */
function createFirebaseConfig(envProvider: RNEnvProvider): FirebaseConfig {
  return {
    apiKey:
      (envProvider.get('VITE_FIREBASE_API_KEY') as string | undefined) ?? '',
    authDomain:
      (envProvider.get('VITE_FIREBASE_AUTH_DOMAIN') as string | undefined) ??
      '',
    projectId:
      (envProvider.get('VITE_FIREBASE_PROJECT_ID') as string | undefined) ?? '',
    storageBucket:
      (envProvider.get('VITE_FIREBASE_STORAGE_BUCKET') as string | undefined) ??
      '',
    messagingSenderId:
      (envProvider.get('VITE_FIREBASE_MESSAGING_SENDER_ID') as
        | string
        | undefined) ?? '',
    appId:
      (envProvider.get('VITE_FIREBASE_APP_ID') as string | undefined) ?? '',
    measurementId:
      (envProvider.get('VITE_FIREBASE_MEASUREMENT_ID') as string | undefined) ??
      '',
  };
}

// Singleton instances
export const rnEnvProvider = new RNEnvProvider();
export const rnAppConfig = createRNAppConfig(rnEnvProvider);

// Re-export for convenience
export type { EnvProvider, AppConfig, EnvironmentVariables, FirebaseConfig };

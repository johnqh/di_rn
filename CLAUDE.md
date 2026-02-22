# di_rn - AI Development Guide

## Overview

**Package**: `@sudobility/di_rn`
**Version**: 0.1.28
**License**: BUSL-1.1
**Package Manager**: Bun (never npm)

React Native implementations of the DI services defined in `@sudobility/di`. Provides platform-specific implementations for storage, networking, theming, notifications, navigation, logging, environment configuration, and centralized app initialization for the Signa Email (0xmail) mobile application.

Every service class implements an interface from `@sudobility/di/interfaces` and registers itself into the DI container so platform-agnostic code can call `getXxxService()` without knowing the platform.

## Project Structure

```
src/
├── index.ts                         # Main barrel export (all public API)
├── initialize/
│   ├── index.ts                     # Re-exports from initialize.ts
│   └── initialize.ts                # initializeRNApp() orchestrator + analytics re-exports
├── storage/
│   ├── storage.rn.ts                # RNStorage, AdvancedRNStorage (AsyncStorage)
│   ├── storage-singleton.ts         # RNStorageService, RNSerializedStorageService, singleton mgmt
│   └── __tests__/storage.rn.test.ts # In-source Vitest tests
├── network/
│   ├── network.rn.ts                # RNNetworkClient (fetch+timeout), RNNetworkService (NetInfo)
│   └── network-singleton.ts         # Singleton management for client + service
├── env/
│   └── env.rn.ts                    # RNEnvProvider (react-native-config), createRNAppConfig()
├── theme/
│   └── theme.rn.ts                  # RNThemeService (Appearance API), font size support
├── notification/
│   └── notification.rn.ts           # RNNotificationService (Notifee), badges, permissions
├── logging/
│   └── logging.rn.ts               # RNLogger (prefixed console), RNLoggerProvider
├── navigation/
│   └── navigation.rn.ts            # RNNavigationService (React Navigation imperative API)
└── info/
    ├── index.ts                     # Re-exports from info.rn.ts + InfoBanner.tsx
    ├── info.rn.ts                   # RNInfoService (observable banner state, auto-dismiss)
    └── InfoBanner.tsx               # React component + useInfoBanner hook (toast messages)

tests/
├── setup.ts                         # Vitest global mocks (AsyncStorage, NetInfo, Notifee, etc.)
└── storage.rn.test.ts               # Storage tests (top-level)
```

## Key Services

| Service | Class | Native Module | Interface | Purpose |
|---------|-------|--------------|-----------|---------|
| Storage | `RNStorage` | `async-storage` | `PlatformStorage` | Key-value persistence (async) |
| Advanced Storage | `AdvancedRNStorage` | async-storage | `AdvancedPlatformStorage` | Storage with TTL + regex pattern clearing |
| Storage Service | `RNStorageService` | async-storage | `StorageService` | DI-compatible storage with `isAvailable()`/`getType()` |
| Serialized Storage | `RNSerializedStorageService` | async-storage | (custom) | JSON object serialize/deserialize to storage |
| Network Client | `RNNetworkClient` | `fetch` | `NetworkClient` | HTTP GET/POST/PUT/DELETE with timeout + AbortController |
| Network Service | `RNNetworkService` | `netinfo` | `PlatformNetwork` | Online/offline monitoring, network status subscriptions |
| Environment | `RNEnvProvider` | `react-native-config` | `EnvProvider` | Env variable access, dev/prod/test detection via `__DEV__` |
| App Config | `createRNAppConfig()` | (wraps RNEnvProvider) | `AppConfig` | Structured config (WildDuck, Indexer, Firebase, WalletConnect) |
| Theme | `RNThemeService` | `Appearance` API | `PlatformTheme` | Light/dark/system theme, font size scaling (small/medium/large) |
| Notifications | `RNNotificationService` | `@notifee/react-native` | `NotificationService` | Local notifications, permissions, badges, Android channels |
| Logging | `RNLogger` | `console` | `Logger` | Prefixed logging with levels, child loggers with tags |
| Logger Provider | `RNLoggerProvider` | `console` | `LoggerProvider` | Creates/manages RNLogger instances |
| Navigation | `RNNavigationService` | `@react-navigation/native` | `NavigationService` | Imperative navigation, nested navigator support, state listeners |
| Info / Toast | `RNInfoService` | `react-native-toast-message` | `InfoInterface` | Observable banner state for toasts with auto-dismiss |
| Info Banner | `InfoBanner` (component) | toast-message | (React component) | Renders toasts, connects to RNInfoService via `useInfoBanner` hook |
| Firebase | (re-exported from `@sudobility/di/rn`) | firebase | (various) | `RNFirebaseService`, `RNAnalyticsClient` for convenience |

## Service Pattern

All services follow the **singleton pattern** with three management functions:

```typescript
initializeXxxService(instance?)  // Create or inject singleton
getXxxService()                  // Retrieve singleton (auto-creates or throws)
resetXxxService()                // Destroy singleton (calls dispose() if available)
```

**Variations**: Storage/Notification/Navigation/Logger `get*()` auto-create if null. Info `get*()` throws if not initialized. Theme/Network `reset*()` calls `dispose()` to clean up native listeners. Network has separate singletons for `NetworkService` and `NetworkClient`.

Each module also exports pre-instantiated instances (`rnStorage`, `rnNetworkClient`, etc.) for direct use, separate from the managed singletons.

## Development Commands

```bash
bun run build          # Compile TypeScript to dist/ (bunx tsc)
bun run dev            # Watch mode build
bun run clean          # Remove dist/
bun run typecheck      # TypeScript check without emit
bun run lint           # ESLint on src/
bun run lint:fix       # Auto-fix ESLint issues
bun run format         # Prettier format src/
bunx vitest run        # Run tests (package.json "test" is placeholder)
bunx vitest run --coverage  # Run with v8 coverage (50% thresholds)
```

CI/CD uses reusable workflow from `johnqh/workflows/.github/workflows/unified-cicd.yml@main` on push/PR to `main`/`develop`.

## Architecture & Patterns

### Lazy Native Module Loading

Native modules are loaded on-demand via `require()` in try-catch to prevent crashes when not linked:

```typescript
let AsyncStorageModule: AsyncStorageStatic | null = null;
function getAsyncStorage(): AsyncStorageStatic | null {
  if (!AsyncStorageModule) {
    try {
      const mod = require('@react-native-async-storage/async-storage');
      AsyncStorageModule = mod.default ?? mod;
    } catch (e) { console.warn('AsyncStorage not available:', e); }
  }
  return AsyncStorageModule;
}
```

Used for: AsyncStorage, NetInfo, Notifee, Appearance, toast-message. Exception: `env.rn.ts` throws on load if `react-native-config` is missing.

### Deferred Initialization

Services subscribing to native events defer listener setup until first use via `ensureInitialized()`, preventing native module crashes at import time:

```typescript
private ensureInitialized(): void {
  if (this.initialized) return;
  this.initialized = true;
  this.initializeNetworkMonitoring();
}
```

Used by: `RNNetworkService`, `RNThemeService`.

### Observable Pattern

Services emitting state changes use `Set<Listener>` with subscribe returning an unsubscribe function:

```typescript
watchNetworkStatus(callback: (isOnline: boolean) => void): () => void {
  this.listeners.add(callback);
  return () => { this.listeners.delete(callback); };
}
```

Used by: `RNNetworkService`, `RNThemeService`, `RNInfoService`, `RNNavigationService`.

### React Hook Integration

`useInfoBanner` bridges observable services to React state via `useState` + `useEffect` with auto-cleanup.

### DI Bridge

`initializeInfoService()` registers with both the local singleton and `@sudobility/di` so `getInfoService()` works from either package.

### Dynamic Optional Imports

Optional deps (`@sudobility/auth_lib`, `@sudobility/subscription_lib`) are loaded via `await import()` inside `initializeRNApp()` with try-catch.

### App Initialization Order

`initializeRNApp(options)` orchestrates startup in required order:

1. **Storage** -- `initializeStorageService()`
2. **Firebase** -- `initializeFirebaseService(options)`
3. **Analytics** -- `initializeFirebaseAnalytics()`
4. **Firebase Auth** -- dynamic import of `auth_lib` (optional)
5. **Network** -- `initializeDiNetworkService()`
6. **Info** -- `initializeInfoService()`
7. **RevenueCat** -- dynamic import of `subscription_lib` (optional)
8. **i18n** -- user-provided `initializeI18n()` callback (optional)

Returns initialized `FirebaseAnalyticsService`.

### Dispose Pattern

Services with native listeners implement `dispose()` to remove event listeners and clear subscriber sets. Called by `resetXxxService()`.

## Common Tasks

### Adding a new service

1. Create `src/<domain>/<domain>.rn.ts` implementing interface from `@sudobility/di/interfaces`
2. Lazy-load native modules with try-catch `require()`
3. Add singleton functions: `initialize*()`, `get*()`, `reset*()`
4. Export pre-created instance: `export const rnXxx = new Xxx();`
5. Add exports to `src/index.ts`
6. If needed at startup, add to `initializeRNApp()` in correct order

### Adding tests

1. Create test in `tests/<name>.test.ts` or `src/<domain>/__tests__/<name>.test.ts`
2. Add native module mocks to `tests/setup.ts`
3. For storage, use `setAsyncStorageModule(mockStorage)` for DI-based mocking
4. Run: `bunx vitest run`

### Using InfoBanner in an app

```tsx
import { InfoBanner, initializeInfoService } from '@sudobility/di_rn';
initializeInfoService(); // Once at startup
function App() {
  return (<><AppContent /><InfoBanner position="top" topOffset={50} /></>);
}
// Anywhere: getInfoService().show('Done', 'Saved', InfoType.SUCCESS);
```

### Setting up imperative navigation

```tsx
import { rnNavigationService } from '@sudobility/di_rn';
<NavigationContainer
  ref={navigationRef}
  onReady={() => rnNavigationService.setNavigationRef(navigationRef)}
  onStateChange={(state) => rnNavigationService.onStateChange(state)}
/>
// Then: rnNavigationService.navigate('EmailDetail', { emailId: '123' });
```

## TypeScript Configuration

- **Target**: ES2020, **Module**: ESNext, **Resolution**: bundler
- **Custom Conditions**: `["react-native"]`, **JSX**: react-jsx
- **Strict**: All strict flags + `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`
- **Output**: `dist/` with declarations, declaration maps, source maps
- **Excludes**: test files from compilation

## Linting & Formatting

- **ESLint**: Flat config with `@typescript-eslint` + `eslint-plugin-prettier`
- **Prettier**: Semi, singleQuote, trailingComma: es5, printWidth: 80
- **Key rules**: `no-explicit-any: warn`, `no-require-imports: off` (needed for lazy loading)
- **Globals**: `__DEV__`, `fetch`, `FormData`, `Blob`, `AbortController` explicitly declared

## Peer & Key Dependencies

### Required Peers

| Package | Version | Purpose |
|---------|---------|---------|
| `@sudobility/di` | ^1.5.36 | Interfaces this package implements |
| `@sudobility/types` | ^1.9.51 | Shared types (`Optional`, `InfoType`, `NetworkClient`) |
| `react` | ^19.2.3 | React core |
| `react-native` | ^0.83.1 | RN runtime + Appearance API |
| `react-native-toast-message` | ^2.3.3 | Toast display for InfoBanner |

### Optional Peers

- `@sudobility/auth_lib` -- Firebase Auth (dynamically imported)
- `@sudobility/subscription_lib` -- RevenueCat subscriptions (dynamically imported)

### Native Dependencies (installed by consuming app)

| Package | Used By |
|---------|---------|
| `@react-native-async-storage/async-storage` | RNStorage, AdvancedRNStorage |
| `@react-native-community/netinfo` | RNNetworkService |
| `@notifee/react-native` | RNNotificationService |
| `@react-navigation/native` | RNNavigationService |
| `react-native-config` | RNEnvProvider (**required** -- throws if missing) |
| `@react-native-firebase/analytics` | Re-exported analytics |

### Key Dev Dependencies

- `typescript` ~5.9.3, `vitest` ^4.0.17, `eslint` ^9.39.0, `prettier` ^3.6.2

## Environment Variables

Read by `RNEnvProvider` via `react-native-config`. Uses `VITE_` prefix for web counterpart compatibility:

- `VITE_WILDDUCK_URL`, `VITE_INDEXER_URL` -- Backend URLs
- `VITE_WALLETCONNECT_PROJECT_ID`, `VITE_REVENUECAT_API_KEY`, `VITE_PRIVY_APP_ID`
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, etc.
- `VITE_MOCK_DATA` -- Enable mock data fallback (`"true"`)

## Re-exports from @sudobility/di/rn

The barrel `src/index.ts` re-exports Firebase and analytics services for consumer convenience:

- `RNFirebaseService`, `RNFirebaseAnalyticsService`, `createRNFirebaseService`
- `getFirebaseService`, `initializeFirebaseService`, `resetFirebaseService`
- `RNAnalyticsClient`, `getAnalyticsClient`, `initializeAnalyticsClient`, `resetAnalyticsClient`, `rnAnalyticsClient`

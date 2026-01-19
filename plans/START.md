# di_rn Implementation Plan

React Native DI library mirroring `@sudobility/di_web`.

## Overview

| Feature | di_web | di_rn |
|---------|--------|-------|
| Info Banner | `@sudobility/components` Banner | `react-native-toast-message` |
| Firebase Config | JS config param | Native files (build-time) |
| Auth Library | `@sudobility/auth_lib` (web) | `@sudobility/auth_lib` (cross-platform) |
| Subscription | `@sudobility/subscription_lib` (web) | `@sudobility/subscription_lib` (cross-platform) |

## Prerequisites: Library Modifications

Before implementing di_rn, we need to make `auth_lib` and `subscription_lib` cross-platform.

### 1. Modify subscription_lib (~/0xmail/subscription_lib)

**Current state**: Good adapter architecture, only has web adapter.
**Required**: Add RN adapter.

```
src/adapters/
├── index.ts                 # Update exports
├── revenuecat-web.ts        # Existing (uses @revenuecat/purchases-js)
└── revenuecat-rn.ts         # NEW (uses react-native-purchases)
```

**Changes needed**:
- Create `revenuecat-rn.ts` implementing `SubscriptionAdapter` interface
- Update `index.ts` to export RN adapter functions
- Add `react-native-purchases` as optional peer dependency
- Hooks and types are already platform-agnostic (no changes needed)

### 2. Modify auth_lib (~/shapeshyft/auth_lib)

**Current state**: Web-only, uses `firebase` web SDK.
**Required**: Add RN implementations using `@react-native-firebase`.

```
src/
├── config/
│   ├── firebase-init.ts          # Existing web implementation
│   ├── firebase-init.rn.ts       # NEW: RN implementation
│   └── index.ts                  # Update with conditional exports
├── network/
│   ├── FirebaseAuthNetworkService.ts      # Existing web
│   ├── FirebaseAuthNetworkService.rn.ts   # NEW: RN version
│   └── index.ts                           # Update exports
```

**Changes needed**:
- Create RN versions using `@react-native-firebase/app` and `@react-native-firebase/auth`
- Add conditional exports in package.json (react-native field)
- Add `@react-native-firebase/*` as optional peer dependencies

---

## di_rn File Structure

```
~/0xmail/di_rn/
├── package.json
├── tsconfig.json
├── README.md
├── CLAUDE.md
├── src/
│   ├── index.ts                    # Main exports
│   ├── info/
│   │   ├── index.ts                # Info module exports
│   │   ├── info.rn.ts              # RNInfoService
│   │   └── InfoBanner.tsx          # Toast component + useInfoBanner hook
│   └── initialize/
│       ├── index.ts                # Initialize exports
│       └── initialize.ts           # initializeRNApp + FirebaseAnalyticsService
└── tests/
    └── index.test.ts               # Unit tests
```

## Key Interfaces

### RNAppInitOptions

```typescript
export interface RNAppInitOptions {
  /** Enable Firebase Auth via @sudobility/auth_lib */
  enableFirebaseAuth?: boolean;

  /** RevenueCat configuration */
  revenueCatConfig?: RevenueCatConfig;

  /** App-specific i18n initialization */
  initializeI18n?: () => void | Promise<void>;

  /** Firebase options */
  firebaseOptions?: {
    enableAnalytics?: boolean;
    enableRemoteConfig?: boolean;
    enableMessaging?: boolean;
  };
}

export interface RevenueCatConfig {
  apiKey: string;
  apiKeySandbox?: string;
  isProduction?: boolean;
  freeTierPackage?: { packageId: string; name: string };
}
```

## Implementation Steps

### Step 1: Modify subscription_lib

**File: `~/0xmail/subscription_lib/src/adapters/revenuecat-rn.ts`**

```typescript
import type { SubscriptionAdapter, ... } from '../types';

let Purchases: typeof import('react-native-purchases').default | null = null;

function getPurchases() {
  if (!Purchases) {
    try {
      Purchases = require('react-native-purchases').default;
    } catch (e) {
      console.warn('react-native-purchases not available');
    }
  }
  return Purchases;
}

let configured = false;
let apiKey: string | null = null;

export function configureRevenueCatRNAdapter(key: string): void {
  apiKey = key;
}

export function createRevenueCatRNAdapter(): SubscriptionAdapter {
  return {
    async getOfferings(params) { /* ... */ },
    async getCustomerInfo() { /* ... */ },
    async purchase(params) { /* ... */ },
    setUserId(userId, email) { /* ... */ },
  };
}
```

**File: `~/0xmail/subscription_lib/src/adapters/index.ts`**

```typescript
// Web exports
export {
  configureRevenueCatAdapter,
  createRevenueCatAdapter,
  setRevenueCatUser,
  clearRevenueCatUser,
  hasRevenueCatUser,
} from './revenuecat-web.js';

// RN exports
export {
  configureRevenueCatRNAdapter,
  createRevenueCatRNAdapter,
  setRevenueCatRNUser,
  clearRevenueCatRNUser,
  hasRevenueCatRNUser,
} from './revenuecat-rn.js';
```

### Step 2: Modify auth_lib

**File: `~/shapeshyft/auth_lib/src/config/firebase-init.rn.ts`**

```typescript
import type { FirebaseAuthConfig } from './types.js';

let firebaseAuth: ReturnType<typeof import('@react-native-firebase/auth').default> | null = null;

function getFirebaseAuth() {
  if (!firebaseAuth) {
    try {
      const auth = require('@react-native-firebase/auth').default;
      firebaseAuth = auth();
    } catch (e) {
      console.warn('@react-native-firebase/auth not available');
    }
  }
  return firebaseAuth;
}

export function initializeFirebaseAuth(config?: FirebaseAuthConfig): void {
  // RN Firebase is configured via native files, not JS
  // Just verify it's available
  getFirebaseAuth();
}

export function getFirebaseAuth() { /* ... */ }
```

**File: `~/shapeshyft/auth_lib/src/network/FirebaseAuthNetworkService.rn.ts`**

```typescript
import { type NetworkService } from '@sudobility/di';

export class FirebaseAuthNetworkService implements NetworkService {
  // Similar to web version but uses RN Firebase auth
}
```

### Step 3: Create di_rn package

**File: `~/0xmail/di_rn/package.json`**

```json
{
  "name": "@sudobility/di_rn",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@sudobility/di": "^1.5.23",
    "@sudobility/types": "^1.9.48",
    "react": "^18.0.0 || ^19.0.0",
    "react-native": ">=0.70.0",
    "react-native-toast-message": "^2.0.0"
  },
  "peerDependenciesMeta": {
    "@sudobility/auth_lib": { "optional": true },
    "@sudobility/subscription_lib": { "optional": true }
  }
}
```

### Step 4: Implement RNInfoService

**File: `~/0xmail/di_rn/src/info/info.rn.ts`**

- Implements `InfoInterface` from `@sudobility/di`
- Uses `react-native-toast-message` for display
- Observable pattern with `subscribe()` for React integration
- Maps `InfoType` to toast types

### Step 5: Implement InfoBanner Component

**File: `~/0xmail/di_rn/src/info/InfoBanner.tsx`**

```typescript
export function useInfoBanner(): { state: BannerState; dismiss: () => void }

export interface InfoBannerProps {
  toastConfig?: ToastConfig;
  position?: 'top' | 'bottom';
  topOffset?: number;
  bottomOffset?: number;
}

export function InfoBanner(props: InfoBannerProps): React.ReactElement
```

### Step 6: Implement initializeRNApp

**File: `~/0xmail/di_rn/src/initialize/initialize.ts`**

Initialization order:
1. Storage - `initializeStorageService()` from `@sudobility/di`
2. Firebase - `initializeFirebaseService()` from `@sudobility/di`
3. Analytics singleton
4. Auth + Network (if `enableFirebaseAuth`):
   - Import from `@sudobility/auth_lib` (RN version via conditional export)
   - `initializeNetworkService(new FirebaseAuthNetworkService())`
5. Info service
6. RevenueCat (if `revenueCatConfig`):
   - Import RN adapter from `@sudobility/subscription_lib`
   - `configureRevenueCatRNAdapter(apiKey)`
   - `initializeSubscription({ adapter: createRevenueCatRNAdapter(), ... })`
7. i18n (if provided)

## Exports

```typescript
// Info service & React
export {
  RNInfoService,
  createRNInfoService,
  initializeInfoService,
  getInfoService,
  resetInfoService,
  InfoBanner,
  useInfoBanner,
  type BannerState,
  type BannerStateListener,
  type InfoBannerProps,
} from './info/index.js';

// Initialize & Analytics
export {
  FirebaseAnalyticsService,
  initializeFirebaseAnalytics,
  getAnalyticsService,
  resetAnalyticsService,
  type AnalyticsEventParams,
  initializeRNApp,
  type RNAppInitOptions,
  type RevenueCatConfig,
} from './initialize/index.js';
```

## Usage Example

```typescript
// App.tsx
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeRNApp, InfoBanner } from '@sudobility/di_rn';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeRNApp({
      enableFirebaseAuth: true,
      revenueCatConfig: {
        apiKey: 'rc_prod_xxx',
        apiKeySandbox: 'rc_sandbox_xxx',
        isProduction: !__DEV__,
      },
    }).then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {/* App content */}
      </NavigationContainer>
      <InfoBanner position="top" topOffset={50} />
    </SafeAreaProvider>
  );
}
```

## Reference Files

| Purpose | File |
|---------|------|
| di_web initializeWebApp | `~/0xmail/di_web/src/initialize/initialize.ts` |
| di_web InfoService | `~/0xmail/di_web/src/info/info.web.ts` |
| di_web InfoBanner | `~/0xmail/di_web/src/info/InfoBanner.tsx` |
| RN Firebase service | `~/0xmail/di/src/rn/firebase/firebase.rn.ts` |
| subscription_lib web adapter | `~/0xmail/subscription_lib/src/adapters/revenuecat-web.ts` |
| auth_lib firebase init | `~/shapeshyft/auth_lib/src/config/firebase-init.ts` |

## Implementation Order

1. **subscription_lib**: Add `revenuecat-rn.ts` adapter
2. **auth_lib**: Add RN implementations for firebase-init and FirebaseAuthNetworkService
3. **di_rn**: Create package with info service and initializeRNApp

## Verification

1. Build all packages: `bun run build`
2. Typecheck: `bun run typecheck`
3. Test in mail_box_rn:
   - Update dependencies to use local packages
   - Replace manual initialization with `initializeRNApp()`
   - Add `<InfoBanner />` to App.tsx
   - Verify toast notifications work
   - Verify Firebase analytics events are logged
   - Verify RevenueCat offerings load

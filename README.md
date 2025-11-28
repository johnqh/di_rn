# @sudobility/di_rn

React Native implementations of dependency injection services for Signa Email.

## Installation

```bash
npm install @sudobility/di_rn
```

### Peer Dependencies

Make sure you have the following peer dependencies installed:

```bash
npm install @sudobility/di @sudobility/types react react-native
```

### Native Dependencies

This package requires the following native dependencies:

```bash
npm install @react-native-async-storage/async-storage
npm install @react-native-community/netinfo
npm install @react-navigation/native
npm install @react-native-firebase/analytics
npm install @notifee/react-native
npm install react-native-config
```

Follow the installation instructions for each native dependency in their respective documentation.

## Usage

### Storage

```typescript
import { rnStorage, advancedRNStorage, getStorageService } from '@sudobility/di_rn';

// Basic storage
await rnStorage.setItem('key', 'value');
const value = await rnStorage.getItem('key');

// Advanced storage with TTL
await advancedRNStorage.setItem('key', 'value', 60000); // 60 second TTL
const value = await advancedRNStorage.getItem('key'); // Returns null if expired

// Storage service singleton
const storageService = getStorageService();
await storageService.setItem('key', 'value');
```

### Network

```typescript
import { rnNetworkClient, rnNetworkService } from '@sudobility/di_rn';

// HTTP requests
const response = await rnNetworkClient.get<User>('/api/user');
const data = response.data;

// Network status
const isOnline = rnNetworkService.isOnline();

// Watch for network changes
const unsubscribe = rnNetworkService.watchNetworkStatus((isOnline) => {
  console.log('Network status:', isOnline);
});
```

### Environment

```typescript
import { rnEnvProvider, rnAppConfig } from '@sudobility/di_rn';

// Get environment variables
const apiUrl = rnEnvProvider.get('VITE_INDEXER_URL');

// Use pre-configured app config
const { indexerUrl, walletConnectProjectId } = rnAppConfig;
```

### Analytics

```typescript
import { rnAnalyticsClient } from '@sudobility/di_rn';

// Track events
await rnAnalyticsClient.trackEvent('wallet_connected', { chain: 'ethereum' });

// Set user properties
await rnAnalyticsClient.setUserProperties({ plan: 'premium' });

// Set user ID
await rnAnalyticsClient.setUserId('user-123');

// Track screen views
await rnAnalyticsClient.setCurrentScreen('ConnectWallet');
```

### Notifications

```typescript
import { rnNotificationService } from '@sudobility/di_rn';

// Request permission
const granted = await rnNotificationService.requestPermission();

// Show notification
const result = await rnNotificationService.showNotification('New Email', {
  body: 'You have a new message from alice.eth',
  data: { emailId: '123' },
});
```

### Theme

```typescript
import { rnThemeService } from '@sudobility/di_rn';

// Apply theme
rnThemeService.applyTheme('dark'); // 'light' | 'dark' | 'system'

// Get resolved theme
const theme = rnThemeService.getResolvedTheme(); // 'light' | 'dark'

// Watch for theme changes
const unsubscribe = rnThemeService.watchSystemTheme((theme) => {
  console.log('Theme changed:', theme);
});
```

### Navigation

```typescript
import { rnNavigationService } from '@sudobility/di_rn';

// In App.tsx, set the navigation ref
const navigationRef = useNavigationContainerRef();
rnNavigationService.setNavigationRef(navigationRef);

// Navigate programmatically
rnNavigationService.navigate('EmailDetail', { emailId: '123' });

// Go back
rnNavigationService.goBack('/Inbox');
```

### Logging

```typescript
import { rnLogger, getLogger } from '@sudobility/di_rn';

// Log messages
rnLogger.info('App started');
rnLogger.warn('Low memory');
rnLogger.error('Network error', error);

// Create child logger with tag
const authLogger = rnLogger.child('Auth');
authLogger.info('User logged in');
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
VITE_INDEXER_URL=https://indexer.0xmail.box
VITE_WILDDUCK_URL=https://wildduck.0xmail.box
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
VITE_REVENUECAT_API_KEY=your-api-key
VITE_ALCHEMY_API_KEY=your-alchemy-key
VITE_FIREBASE_API_KEY=your-firebase-key
VITE_FIREBASE_PROJECT_ID=your-project-id
# ... other Firebase config
```

## License

MIT

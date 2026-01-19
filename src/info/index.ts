/**
 * Info module exports for React Native
 *
 * Provides RNInfoService and InfoBanner for displaying
 * info messages using react-native-toast-message.
 */

// Service
export {
  RNInfoService,
  createRNInfoService,
  initializeInfoService,
  getInfoService,
  resetInfoService,
  mapInfoTypeToToastType,
  type BannerState,
  type BannerStateListener,
} from './info.rn.js';

// React components and hooks
export {
  InfoBanner,
  useInfoBanner,
  type InfoBannerProps,
} from './InfoBanner.js';

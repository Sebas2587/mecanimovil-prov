// Jest setup file
// Note: @testing-library/react-native v12.4+ includes matchers natively
// No need to import extend-expect separately

// Polyfill for React Native setup-env (missing in RN 0.86)
global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useLocalSearchParams: () => ({}),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// NativeAnimatedHelper is mocked by jest-expo preset automatically

// Mock expo modules that might not be available in test environment
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      apiUrl: 'https://test-api.example.com/api',
    },
  },
  appOwnership: 'standalone',
}));

// Global test timeout
jest.setTimeout(10000);

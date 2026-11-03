/**
 * Platform-agnostic export for Google Sign-In flow
 * Metro bundler will automatically use .native.ts or .web.ts based on platform
 */

export { useGoogleSignInFlow, getConnectedGoogleAccountsAsync, clearConnectedGoogleAccountsAsync, clearLastGoogleEmail } from './useGoogleSignInFlow.native';
export type { ConnectedGoogleAccount } from './useGoogleSignInFlow.native';

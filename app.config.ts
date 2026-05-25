import type { ConfigContext, ExpoConfig } from 'expo/config';

import appJson from './app.json';

/** com.googleusercontent.apps.<id> a partir del iOS Client ID de Google Cloud. */
function reversedIosUrlScheme(iosClientId: string | undefined): string | null {
  if (!iosClientId?.trim()) return null;
  const suffix = '.apps.googleusercontent.com';
  if (!iosClientId.includes(suffix)) return null;
  const idPart = iosClientId.replace(suffix, '').trim();
  return `com.googleusercontent.apps.${idPart}`;
}

function patchGoogleSignInPlugin(
  plugins: ExpoConfig['plugins'],
  iosUrlScheme: string | null,
): ExpoConfig['plugins'] {
  if (!plugins || !iosUrlScheme) return plugins;

  return plugins.map((plugin) => {
    if (plugin === '@react-native-google-signin/google-signin') {
      return [
        '@react-native-google-signin/google-signin',
        { iosUrlScheme },
      ] as const;
    }
    if (
      Array.isArray(plugin) &&
      plugin[0] === '@react-native-google-signin/google-signin'
    ) {
      return [
        '@react-native-google-signin/google-signin',
        { ...(plugin[1] as object), iosUrlScheme },
      ] as const;
    }
    return plugin;
  });
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = (appJson.expo ?? config) as ExpoConfig;
  const iosUrlScheme = reversedIosUrlScheme(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  );

  return {
    ...base,
    plugins: patchGoogleSignInPlugin(base.plugins, iosUrlScheme),
  };
};

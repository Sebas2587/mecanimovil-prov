import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IS_EXPO_GO = Constants.appOwnership === 'expo';
const ACCOUNTS_KEY = 'mecanimovil-prov:connectedGoogleAccounts';
const MAX_ACCOUNTS = 5;

function decodeJwtPayload(token: string): Record<string, string> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(part.length + ((4 - (part.length % 4)) % 4), '=');
    if (typeof atob === 'function') {
      return JSON.parse(atob(padded));
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Buffer } = require('buffer');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export type ConnectedGoogleAccount = {
  email: string;
  name: string;
  picture: string;
};

export async function getConnectedGoogleAccountsAsync(): Promise<ConnectedGoogleAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((a) => a && a.email) : [];
  } catch {
    return [];
  }
}

export function getConnectedGoogleAccounts(): ConnectedGoogleAccount[] {
  return [];
}

async function rememberGoogleAccount({
  email,
  name,
  picture,
}: {
  email: string;
  name?: string;
  picture?: string;
}) {
  if (!email) return;
  try {
    const list = (await getConnectedGoogleAccountsAsync()).filter((a) => a.email !== email);
    list.unshift({ email, name: name || '', picture: picture || '' });
    if (list.length > MAX_ACCOUNTS) list.length = MAX_ACCOUNTS;
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* no crítico */
  }
}

export async function clearConnectedGoogleAccountsAsync() {
  try {
    await AsyncStorage.removeItem(ACCOUNTS_KEY);
  } catch {
    /* no crítico */
  }
}

export const getLastGoogleEmail = () => null;
export const clearLastGoogleEmail = () => clearConnectedGoogleAccountsAsync();

type LoginWithGoogleFn = (
  idToken: string,
  flow?: 'login' | 'register',
) => Promise<{
  success: boolean;
  error?: string;
  code?: string;
  profile?: { email?: string; given_name?: string; family_name?: string };
}>;

export function useGoogleSignInFlow(
  loginWithGoogle: LoginWithGoogleFn,
  options: {
    flow?: 'login' | 'register';
    onUserNotFound?: (profile?: {
      email?: string;
      given_name?: string;
      family_name?: string;
    }) => void;
  } = {},
) {
  const flow = options.flow || 'login';
  const onUserNotFound = options.onUserNotFound;
  const [googleLoading, setGoogleLoading] = useState(false);

  const _doSignIn = useCallback(
    async (forceAccountChooser: boolean, loginHint: string | null) => {
      if (IS_EXPO_GO) {
        Alert.alert(
          'Google Sign-In',
          'Usa la app instalada (dev build). En Expo Go no está disponible el módulo nativo de Google.',
        );
        return;
      }

      let GoogleSignin: {
        hasPlayServices: (opts: object) => Promise<void>;
        signOut: () => Promise<void>;
        signIn: (opts?: { loginHint?: string }) => Promise<{
          data?: { idToken?: string; user?: { name?: string; photo?: string } };
          idToken?: string;
        }>;
      };
      let statusCodes: Record<string, string> = {};
      try {
        const lib = require('@react-native-google-signin/google-signin');
        GoogleSignin = lib.GoogleSignin;
        statusCodes = lib.statusCodes;
      } catch {
        Alert.alert('Google', 'Google Sign-In no está disponible en este entorno.');
        return;
      }

      setGoogleLoading(true);
      try {
        if (Platform.OS === 'android') {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }
        if (forceAccountChooser) {
          try {
            await GoogleSignin.signOut();
          } catch {
            /* ignore */
          }
        }

        let response;
        try {
          response = await GoogleSignin.signIn(loginHint ? { loginHint } : undefined);
        } catch {
          response = await GoogleSignin.signIn();
        }

        const idToken = response?.data?.idToken || response?.idToken;
        if (!idToken) throw new Error('No se obtuvo idToken de Google.');

        const result = await loginWithGoogle(idToken, flow);

        const payload = decodeJwtPayload(idToken);
        if (payload?.email && result?.success) {
          await rememberGoogleAccount({
            email: payload.email,
            name: payload.name || response?.data?.user?.name,
            picture: payload.picture || response?.data?.user?.photo || '',
          });
        }

        if (result?.code === 'USER_NOT_FOUND') {
          onUserNotFound?.(result?.profile);
          return;
        }
        if (result?.code === 'CLIENT_ACCOUNT') {
          Alert.alert(
            'Cuenta de cliente',
            'Esta cuenta está registrada como cliente.\n\nPara acceder, utiliza la aplicación MecaniMóvil Usuarios.',
            [{ text: 'Entendido' }],
          );
          return;
        }
        if (!result?.success) {
          Alert.alert('Error', result?.error || 'No se pudo iniciar sesión con Google.');
        }
      } catch (e: any) {
        if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
          /* cancelado */
        } else if (e?.code === statusCodes.IN_PROGRESS) {
          /* en curso */
        } else {
          Alert.alert('Google', e?.message || 'No se pudo iniciar sesión con Google.');
        }
      } finally {
        setGoogleLoading(false);
      }
    },
    [loginWithGoogle, flow, onUserNotFound],
  );

  const handleGoogleSignIn = useCallback(() => _doSignIn(false, null), [_doSignIn]);

  const signInWithAccountChooser = useCallback(
    (opts: { loginHint?: string } = {}) => _doSignIn(!opts.loginHint, opts.loginHint || null),
    [_doSignIn],
  );

  return {
    handleGoogleSignIn,
    googleLoading,
    googleButtonDisabled: IS_EXPO_GO,
    isWebOAuthReady: false,
    renderNativeGoogleButton: undefined,
    signInWithAccountChooser,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { showAlert } from '@/utils/platformAlert';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const ACCOUNTS_KEY = 'mecanimovil-prov:connectedGoogleAccounts';
const MAX_ACCOUNTS = 5;
const CALLBACK_PATH = '/oauth-callback.html';

function _readAccountsSync(): ConnectedGoogleAccount[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((a) => a && typeof a.email === 'string') : [];
  } catch {
    return [];
  }
}

export type ConnectedGoogleAccount = {
  email: string;
  name: string;
  picture: string;
};

export async function getConnectedGoogleAccountsAsync() {
  return _readAccountsSync();
}

export function getConnectedGoogleAccounts() {
  return _readAccountsSync();
}

function rememberGoogleAccount({
  email,
  name,
  picture,
}: {
  email: string;
  name?: string;
  picture?: string;
}) {
  if (!email || typeof window === 'undefined' || !window.localStorage) return;
  try {
    const current = _readAccountsSync().filter((a) => a.email !== email);
    current.unshift({ email, name: name || '', picture: picture || '' });
    if (current.length > MAX_ACCOUNTS) current.length = MAX_ACCOUNTS;
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(current));
  } catch {
    /* no crítico */
  }
}

export async function clearConnectedGoogleAccountsAsync() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(ACCOUNTS_KEY);
  } catch {
    /* no crítico */
  }
}

export const getLastGoogleEmail = () => _readAccountsSync()[0]?.email || null;
export const clearLastGoogleEmail = () => clearConnectedGoogleAccountsAsync();

function decodeJwtPayload(token: string): Record<string, string> | null {
  try {
    const part = token.split('.')[1];
    const padded = part
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(part.length + ((4 - (part.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function buildAuthUrl({
  loginHint,
  forceChooser,
  nonce,
  redirectUri,
}: {
  loginHint?: string;
  forceChooser: boolean;
  nonce: string;
  redirectUri: string;
}) {
  const params = new URLSearchParams({
    client_id: WEB_CLIENT_ID || '',
    response_type: 'id_token',
    scope: 'openid email profile',
    redirect_uri: redirectUri,
    nonce,
  });
  if (forceChooser) params.set('prompt', 'select_account');
  if (loginHint) params.set('login_hint', loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function openGoogleAuthPopup({ loginHint, forceChooser }: { loginHint?: string; forceChooser: boolean }) {
  return new Promise<string>((resolve, reject) => {
    if (!WEB_CLIENT_ID) {
      reject(new Error('no_client_id'));
      return;
    }
    const NONCE =
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const REDIRECT_URI = window.location.origin + CALLBACK_PATH;
    const url = buildAuthUrl({
      loginHint,
      forceChooser,
      nonce: NONCE,
      redirectUri: REDIRECT_URI,
    });

    const w = 500;
    const h = 620;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      url,
      'mecanimovil-prov-google-auth',
      `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`,
    );
    if (!popup) {
      reject(new Error('popup_blocked'));
      return;
    }

    let settled = false;
    let messageReceived = false;
    const startTime = Date.now();

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearInterval(closeWatcher);
      clearTimeout(timeoutId);
    };

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== 'mecanimovil:google-oauth') return;
      messageReceived = true;
      const hash = (data.hash || '').replace(/^#/, '');
      const search = (data.search || '').replace(/^\?/, '');
      const params = new URLSearchParams(hash || search);
      const idToken = params.get('id_token');
      const err = params.get('error');
      const errDesc = params.get('error_description');
      settled = true;
      cleanup();
      try {
        popup?.close();
      } catch {
        /* ignore */
      }
      if (idToken) resolve(idToken);
      else if (err) reject(new Error(`oauth_error:${err}${errDesc ? ':' + errDesc : ''}`));
      else reject(new Error('no_id_token'));
    }
    window.addEventListener('message', onMessage);

    const closeWatcher = setInterval(() => {
      if (!settled && popup.closed) {
        settled = true;
        cleanup();
        const elapsed = Date.now() - startTime;
        if (!messageReceived && elapsed > 4000) reject(new Error('likely_oauth_misconfig'));
        else reject(new Error('cancelled'));
      }
    }, 500);

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        try {
          popup.close();
        } catch {
          /* ignore */
        }
        reject(new Error('timeout'));
      }
    }, 180_000);
  });
}

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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const _processCredential = useCallback(
    async (idToken: string) => {
      const result = await loginWithGoogle(idToken, flow);
      const payload = decodeJwtPayload(idToken);
      if (payload?.email && result?.success) {
        rememberGoogleAccount({
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        });
      }

      if (result?.success) return;
      if (result?.code === 'USER_NOT_FOUND') {
        onUserNotFound?.(result?.profile);
        return;
      }
      if (result?.code === 'CLIENT_ACCOUNT') {
        showAlert(
          'Cuenta de cliente',
          'La cuenta de Google que seleccionaste está registrada como cliente.\n\nUtiliza la app MecaniMóvil Usuarios.',
        );
        return;
      }
      showAlert('Error', result?.error || 'No se pudo iniciar sesión con Google.');
    },
    [loginWithGoogle, flow, onUserNotFound],
  );

  const signInWithAccountChooser = useCallback(
    async (opts: { loginHint?: string } = {}) => {
      if (!WEB_CLIENT_ID) {
        showAlert('Google', 'Google Sign-In no está configurado para web.');
        return;
      }
      setGoogleLoading(true);
      try {
        const idToken = await openGoogleAuthPopup({
          loginHint: opts.loginHint,
          forceChooser: !opts.loginHint,
        });
        await _processCredential(idToken);
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (msg === 'cancelled') {
          /* silencioso */
        } else if (msg === 'popup_blocked') {
          showAlert(
            'Popup bloqueado',
            'Tu navegador bloqueó la ventana de Google. Habilita popups para este sitio e intenta nuevamente.',
          );
        } else if (msg === 'likely_oauth_misconfig') {
          showAlert(
            'Configuración de Google',
            `Google rechazó la solicitud.\n\nRegistra en Google Cloud Console:\n${window.location.origin}${CALLBACK_PATH}`,
          );
        } else if (msg.startsWith('oauth_error:')) {
          const errDetail = msg.replace('oauth_error:', '');
          if (errDetail.startsWith('redirect_uri_mismatch')) {
            showAlert(
              'Configuración de Google',
              `URL de redirección no autorizada:\n${window.location.origin}${CALLBACK_PATH}`,
            );
          } else if (!errDetail.startsWith('access_denied')) {
            showAlert('Google', `No se pudo iniciar sesión.\n${errDetail}`);
          }
        } else if (msg !== 'timeout' && msg !== 'no_id_token') {
          showAlert('Google', 'No se pudo iniciar sesión con Google. Intenta nuevamente.');
        }
      } finally {
        if (mountedRef.current) setGoogleLoading(false);
      }
    },
    [_processCredential],
  );

  const handleGoogleSignIn = useCallback(
    () => signInWithAccountChooser(),
    [signInWithAccountChooser],
  );

  return {
    handleGoogleSignIn,
    googleLoading,
    googleButtonDisabled: false,
    isWebOAuthReady: true,
    renderNativeGoogleButton: undefined,
    signInWithAccountChooser,
  };
}

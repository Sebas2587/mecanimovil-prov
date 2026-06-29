/**
 * Carga el Facebook JS SDK (solo web) para Embedded Signup.
 */

declare global {
  interface Window {
    FB?: {
      init: (params: Record<string, string | boolean>) => void;
      login: (
        callback: (response: MetaFbLoginResponse) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export type MetaFbLoginResponse = {
  authResponse?: {
    code?: string;
    accessToken?: string;
  };
  status?: string;
};

export type MetaEmbeddedSession = {
  phone_number_id?: string;
  waba_id?: string;
  business_id?: string;
  waba_ids?: string[];
};

let sdkPromise: Promise<void> | null = null;

export function loadFacebookSdk(appId: string, graphVersion: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Facebook SDK solo disponible en web'));
  }
  if (window.FB) {
    return Promise.resolve();
  }
  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      try {
        window.FB?.init({
          appId,
          cookie: true,
          xfbml: false,
          version: graphVersion,
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    };

    const existing = document.getElementById('facebook-jssdk');
    if (existing && window.FB) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.src = 'https://connect.facebook.net/es_ES/sdk.js';
    script.onerror = () => reject(new Error('No se pudo cargar el SDK de Meta'));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export function listenEmbeddedSignupSession(
  onSession: (session: MetaEmbeddedSession) => void,
): () => void {
  const handler = (event: MessageEvent) => {
    if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
      return;
    }
    let payload: { type?: string; event?: string; data?: MetaEmbeddedSession };
    try {
      payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch {
      return;
    }
    if (payload?.type !== 'WA_EMBEDDED_SIGNUP') {
      return;
    }
    if (payload.event && !['FINISH', 'FINISH_ONLY_WABA', 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'].includes(payload.event)) {
      return;
    }
    if (payload.data) {
      onSession(payload.data);
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

export function launchEmbeddedSignup(config: {
  configId: string;
  channel: 'whatsapp' | 'messenger' | 'instagram';
}): Promise<{ code: string }> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('SDK de Meta no inicializado'));
      return;
    }

    const extras: Record<string, unknown> = {
      setup: {},
      sessionInfoVersion: 2,
    };
    if (config.channel === 'whatsapp') {
      extras.featureType = 'only_waba_sharing';
    }

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (code) {
          resolve({ code });
          return;
        }
        if (response.status === 'unknown') {
          reject(new Error('cancelled'));
          return;
        }
        reject(new Error('Meta no devolvió código de autorización'));
      },
      {
        config_id: config.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras,
      },
    );
  });
}

export function openOAuthPopup(authUrl: string): Promise<{ success: boolean; message?: string }> {
  return new Promise((resolve, reject) => {
    const apiOrigin = (() => {
      try {
        return new URL(authUrl).origin;
      } catch {
        return '';
      }
    })();
    const width = 520;
    const height = 720;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      authUrl,
      'mecanimovil-meta-oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`,
    );
    if (!popup) {
      reject(new Error('popup_blocked'));
      return;
    }

    let settled = false;
    const finish = (result: { success: boolean; message?: string }) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin && event.origin !== apiOrigin) return;
      const data = event.data;
      if (!data || data.type !== 'mecanimovil:meta-oauth') return;
      finish({
        success: data.success !== false,
        message: typeof data.message === 'string' ? data.message : undefined,
      });
    };

    const timer = window.setInterval(() => {
      if (popup.closed) {
        finish({ success: true });
      }
    }, 500);

    function cleanup() {
      window.removeEventListener('message', onMessage);
      window.clearInterval(timer);
    }

    window.addEventListener('message', onMessage);
  });
}

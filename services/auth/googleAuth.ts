import { setItem } from '@/utils/authStorage';
import ServerConfig from '../serverConfig';

export interface GoogleLoginProveedorResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    telefono?: string;
    direccion?: string;
    foto_perfil?: string | null;
    es_mecanico?: boolean;
    tipo_proveedor?: string | null;
  };
}

export type GoogleLoginProveedorResult =
  | GoogleLoginProveedorResponse
  | {
      __clientAccount: true;
      code: 'CLIENT_ACCOUNT';
      error: string;
    };

/**
 * Login/registro con Google (id_token) → POST /usuarios/google-login-proveedor/
 */
export async function googleLoginProveedor(
  idToken: string,
  flow: 'login' | 'register' = 'login',
  aceptaTerminos = true,
): Promise<GoogleLoginProveedorResult> {
  const serverConfig = ServerConfig.getInstance();
  await serverConfig.initialize();
  const baseURL = await serverConfig.getBaseURL();
  const url = `${baseURL.replace(/\/$/, '')}/usuarios/google-login-proveedor/`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ id_token: idToken, flow, acepta_terminos: aceptaTerminos }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const status = response.status;
    const code = data?.code;
    const serverMsg =
      data?.non_field_errors?.[0] ||
      data?.error ||
      data?.detail ||
      `Error ${status}`;

    if (status === 403 && (code === 'CLIENT_ACCOUNT' || serverMsg.includes('usuarios'))) {
      return {
        __clientAccount: true,
        code: 'CLIENT_ACCOUNT',
        error: serverMsg,
      };
    }

    const error: any = new Error(serverMsg);
    error.response = { status, data };
    throw error;
  }

  if (!data?.token || !data?.user) {
    throw new Error('Respuesta inválida de Google login proveedor');
  }

  await setItem('authToken', data.token);
  await setItem('userData', JSON.stringify(data.user));

  return data as GoogleLoginProveedorResponse;
}

type ApiErrorLike = {
  message?: string;
  response?: { data?: unknown; status?: number };
};

function mensajesDesdeObjeto(data: Record<string, unknown>): string[] {
  const lineas: string[] = [];

  if (typeof data.detail === 'string' && data.detail.trim()) {
    lineas.push(data.detail.trim());
  }
  if (typeof data.error === 'string' && data.error.trim()) {
    lineas.push(data.error.trim());
  }
  const code = typeof data.code === 'string' ? data.code : '';
  if (code === 'cuota_agotada' || code === 'sin_suscripcion' || code === 'limite_canales') {
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error.trim();
    }
  }
  if (Array.isArray(data.non_field_errors)) {
    for (const item of data.non_field_errors) {
      if (typeof item === 'string' && item.trim()) lineas.push(item.trim());
    }
  }

  for (const [campo, valor] of Object.entries(data)) {
    if (campo === 'detail' || campo === 'error' || campo === 'non_field_errors') continue;
    if (Array.isArray(valor)) {
      for (const item of valor) {
        if (typeof item === 'string' && item.trim()) {
          lineas.push(`${campo}: ${item.trim()}`);
        }
      }
    } else if (typeof valor === 'string' && valor.trim()) {
      lineas.push(`${campo}: ${valor.trim()}`);
    }
  }

  return lineas;
}

/**
 * Mensaje legible desde errores de axios, fetch o Error lanzados en la app.
 */
export function extraerMensajeErrorApi(
  error: ApiErrorLike | null | undefined,
  fallback = 'Ocurrió un error. Intenta nuevamente.',
): string {
  if (!error) return fallback;

  const data = error.response?.data;
  if (data != null) {
    if (typeof data === 'string' && data.trim()) return data.trim();
    if (typeof data === 'object' && data !== null) {
      const lineas = mensajesDesdeObjeto(data as Record<string, unknown>);
      if (lineas.length > 0) return [...new Set(lineas)].join('\n');
    }
  }

  const msg = error.message?.trim();
  if (msg && !/^Request failed with status code \d+$/i.test(msg)) {
    return msg;
  }

  const status = error.response?.status;
  if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return 'Recurso no encontrado.';
  if (status === 400) return 'Datos inválidos. Revisa los campos e intenta de nuevo.';
  if (status && status >= 500) return 'Error del servidor. Intenta más tarde.';

  return fallback;
}

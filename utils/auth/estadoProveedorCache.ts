import type { EstadoProveedor } from '@/services/api';
import { deleteItem, getItem, setItem } from '@/utils/authStorage';

/** Persistencia del último estado bueno — evita bloquear el arranque web/nativo si la API falla un momento. */
export const ESTADO_PROVEEDOR_CACHE_KEY = 'estadoProveedorCache';

export async function saveEstadoProveedorCache(estado: EstadoProveedor): Promise<void> {
  try {
    await setItem(ESTADO_PROVEEDOR_CACHE_KEY, JSON.stringify(estado));
  } catch {
    /* no crítico */
  }
}

export async function loadEstadoProveedorCache(): Promise<EstadoProveedor | null> {
  try {
    const raw = await getItem(ESTADO_PROVEEDOR_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as EstadoProveedor;
  } catch {
    return null;
  }
}

export async function clearEstadoProveedorCache(): Promise<void> {
  try {
    await deleteItem(ESTADO_PROVEEDOR_CACHE_KEY);
  } catch {
    /* no crítico */
  }
}

/** Estado usable para navegar (perfil activo / onboarding resuelto). */
export function isUsableEstadoProveedorCache(estado: EstadoProveedor | null | undefined): boolean {
  if (!estado) return false;
  if (estado.estado_verificacion === 'aprobado') return true;
  if (estado.onboarding_completado) return true;
  if (estado.necesita_onboarding === false) return true;
  if (estado.tiene_perfil) return true;
  return false;
}

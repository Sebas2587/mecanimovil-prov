import type { EstadoProveedor } from '@/services/api';

/**
 * Clave estable para decidir si el “perfil proveedor” cambió de verdad.
 * Evita re-disparar useEffects masivos cuando solo cambia la referencia del objeto
 * (p. ej. tras refrescarEstadoProveedor con los mismos datos).
 */
export function estadoProveedorReloadKey(estado: EstadoProveedor | null): string {
  if (!estado) return '__null__';
  return [
    estado.tiene_perfil ? '1' : '0',
    estado.tipo_proveedor ?? '',
    estado.estado_verificacion ?? '',
    estado.onboarding_completado ? '1' : '0',
    estado.necesita_onboarding ? '1' : '0',
    estado.verificado ? '1' : '0',
  ].join('|');
}

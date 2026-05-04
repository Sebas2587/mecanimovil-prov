/**
 * Preferencia sincrónica “radar de oportunidades activo” para servicios que no pueden usar React Context
 * (WebSocket, connectionService). Se actualiza desde RadarOportunidadesProvider.
 */
let preferenciaCargada = false;
let preferenciaActiva = true;

export function resetRadarOportunidadesGate(): void {
  preferenciaCargada = false;
  preferenciaActiva = true;
}

/** Llamar al hidratar desde AsyncStorage o al login. */
export function setRadarOportunidadesPreferencia(activa: boolean, cargada: boolean): void {
  preferenciaActiva = activa;
  preferenciaCargada = cargada;
}

export function isRadarOportunidadesPreferenciaCargada(): boolean {
  return preferenciaCargada;
}

/** Si el proveedor eligió estar activo para recibir oportunidades (y ya se cargó la preferencia). */
export function isRadarOportunidadesActivo(): boolean {
  return preferenciaCargada && preferenciaActiva;
}

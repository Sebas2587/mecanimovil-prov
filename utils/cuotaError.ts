import type { AxiosError } from 'axios';

export type CuotaErrorCode = 'cuota_agotada' | 'sin_suscripcion' | 'limite_canales';

export interface CuotaErrorPayload {
  error?: string;
  code?: CuotaErrorCode | string;
  feature?: string;
  limite?: number;
  usados?: number;
  creditos_necesarios?: number;
  saldo_creditos?: number;
}

export function extraerCuotaError(error: unknown): CuotaErrorPayload | null {
  const axiosErr = error as AxiosError<CuotaErrorPayload>;
  const data = axiosErr?.response?.data;
  if (!data || typeof data !== 'object') return null;
  const code = data.code;
  if (code === 'cuota_agotada' || code === 'sin_suscripcion' || code === 'limite_canales') {
    return data;
  }
  return null;
}

export function esErrorCuota(error: unknown): boolean {
  return extraerCuotaError(error) !== null;
}

export function mensajeCuotaError(error: unknown, fallback = 'Límite del plan alcanzado.'): string {
  const payload = extraerCuotaError(error);
  if (payload?.error?.trim()) return payload.error.trim();
  return fallback;
}

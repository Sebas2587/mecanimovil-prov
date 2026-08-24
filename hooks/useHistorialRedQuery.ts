import { useQuery } from '@tanstack/react-query';
import {
  consultarHistorialRed,
  patenteHistorialValida,
  type HistorialRedResponse,
} from '@/services/vehiculoService';

export const HISTORIAL_RED_QUERY_KEY = 'historial-red';

export function historialRedQueryKey(patente: string) {
  return [HISTORIAL_RED_QUERY_KEY, patente] as const;
}

export function useHistorialRedQuery(patente: string | undefined) {
  const key = (patente || '').trim();
  return useQuery<HistorialRedResponse>({
    queryKey: historialRedQueryKey(key),
    queryFn: () => consultarHistorialRed(key),
    enabled: patenteHistorialValida(key),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

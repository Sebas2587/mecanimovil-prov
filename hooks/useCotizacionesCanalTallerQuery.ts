import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import cotizacionCanalService from '@/services/cotizacionCanalService';

export const COTIZACIONES_CANAL_QUERY_KEY = 'cotizaciones-canal-taller';

export function useCotizacionesCanalTallerQuery(enabled = true, q?: string) {
  const consulta = q?.trim() || '';
  return useQuery({
    queryKey: [COTIZACIONES_CANAL_QUERY_KEY, consulta || null],
    queryFn: () => cotizacionCanalService.listar({
      page_size: 100,
      q: consulta || undefined,
    }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchInterval: enabled ? 30_000 : false,
    refetchOnWindowFocus: true,
  });
}

export function useInvalidateCotizacionesCanalTaller() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [COTIZACIONES_CANAL_QUERY_KEY] });
}

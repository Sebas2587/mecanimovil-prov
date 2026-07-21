import { useQuery, useQueryClient } from '@tanstack/react-query';
import cotizacionCanalService from '@/services/cotizacionCanalService';

export const COTIZACIONES_CANAL_QUERY_KEY = 'cotizaciones-canal-taller';

export function useCotizacionesCanalTallerQuery(enabled = true) {
  return useQuery({
    queryKey: [COTIZACIONES_CANAL_QUERY_KEY],
    queryFn: () => cotizacionCanalService.listar({ page_size: 100 }),
    enabled,
    staleTime: 20_000,
  });
}

export function useInvalidateCotizacionesCanalTaller() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [COTIZACIONES_CANAL_QUERY_KEY] });
}

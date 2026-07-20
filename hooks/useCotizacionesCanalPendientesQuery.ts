import { useQuery } from '@tanstack/react-query';
import pipelineComercialService from '@/services/pipelineComercialService';

export const COTIZACIONES_CANAL_PENDIENTES_KEY = ['cotizaciones-canal-pendientes-24h'];

/**
 * Cuenta cotizaciones enviadas por canal (WhatsApp/IG/Messenger) que el
 * cliente no ha respondido hace más de 24h. Es la señal que vive en el tab
 * Chats (mensajería), no en el pipeline de agendamientos del Home.
 */
export function useCotizacionesCanalPendientesQuery(enabled: boolean) {
  return useQuery({
    queryKey: COTIZACIONES_CANAL_PENDIENTES_KEY,
    queryFn: async () => {
      const data = await pipelineComercialService.listar({
        estado_normalizado: 'cotizacion_enviada',
        esperando_24h: true,
        limite: 100,
      });
      return data.results.filter((row) => row.tipo_entidad === 'cotizacion_canal').length;
    },
    enabled,
    staleTime: 60_000,
    initialData: 0,
  });
}

export default useCotizacionesCanalPendientesQuery;

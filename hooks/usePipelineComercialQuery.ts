import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import pipelineComercialService, {
  type PipelineComercialParams,
  type PipelineComercialResponse,
} from '@/services/pipelineComercialService';

export const PIPELINE_COMERCIAL_QUERY_KEY = 'pipeline-comercial';

export type PipelineQueryParams = PipelineComercialParams & {
  /** Si true, no aplica filtro de estado en el request (filtrado client-side). */
  fetchAllEstados?: boolean;
};

export function pipelineQueryKey(params: PipelineQueryParams) {
  return [
    PIPELINE_COMERCIAL_QUERY_KEY,
    params.limite ?? 50,
    params.origen ?? 'all',
    params.esperando_24h ?? false,
    params.miembro_taller ?? null,
    params.fetchAllEstados ?? false,
    params.estado_normalizado ?? null,
  ] as const;
}

async function fetchPipeline(params: PipelineQueryParams): Promise<PipelineComercialResponse> {
  const { fetchAllEstados, ...rest } = params;
  const apiParams: PipelineComercialParams = { ...rest };
  if (fetchAllEstados) {
    delete apiParams.estado_normalizado;
  }
  return pipelineComercialService.listar(apiParams);
}

export function usePipelineComercialQuery(
  params: PipelineQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: pipelineQueryKey(params),
    queryFn: () => fetchPipeline(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useInvalidatePipelineComercial() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [PIPELINE_COMERCIAL_QUERY_KEY] });
}

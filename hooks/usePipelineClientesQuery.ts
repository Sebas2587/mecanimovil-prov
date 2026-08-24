import { keepPreviousData, useQuery } from '@tanstack/react-query';
import pipelineComercialService, {
  type PipelineClienteFicha,
  type PipelineClientesParams,
  type PipelineClientesResponse,
} from '@/services/pipelineComercialService';
import { PIPELINE_COMERCIAL_QUERY_KEY } from '@/hooks/usePipelineComercialQuery';

export const PIPELINE_CLIENTES_QUERY_KEY = 'pipeline-comercial-clientes';

export function pipelineClientesQueryKey(params: PipelineClientesParams) {
  return [
    PIPELINE_COMERCIAL_QUERY_KEY,
    PIPELINE_CLIENTES_QUERY_KEY,
    params.limite ?? 100,
    params.origen ?? 'all',
    params.prioridad ?? 'todos',
    params.q?.trim() || null,
  ] as const;
}

export function usePipelineClientesQuery(
  params: PipelineClientesParams,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: pipelineClientesQueryKey(params),
    queryFn: () => pipelineComercialService.listarClientes(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: enabled ? 30_000 : false,
    refetchOnWindowFocus: true,
  });
}

export function pipelineClienteDetalleQueryKey(clienteKey: string) {
  return [PIPELINE_COMERCIAL_QUERY_KEY, 'cliente-detalle', clienteKey] as const;
}

export function usePipelineClienteDetalleQuery(clienteKey: string | undefined) {
  const key = clienteKey?.trim() || '';
  return useQuery<PipelineClienteFicha>({
    queryKey: pipelineClienteDetalleQueryKey(key),
    queryFn: () => pipelineComercialService.obtenerCliente(key),
    enabled: Boolean(key),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export type { PipelineClientesResponse };

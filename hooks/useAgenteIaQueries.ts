import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import agenteIaService, { type AgenteIaConfig, type AgenteSesionEstado } from '@/services/agenteIaService';

export const AGENTE_IA_CONFIG_KEY = ['agente-ia-config'] as const;
export const AGENTE_IA_DOCUMENTOS_KEY = ['agente-ia-documentos'] as const;

export function agenteSesionQueryKey(conversationId: string | number | null | undefined) {
  return ['agente-ia-sesion', conversationId] as const;
}

export function useAgenteIaConfigQuery(enabled = true) {
  return useQuery({
    queryKey: AGENTE_IA_CONFIG_KEY,
    queryFn: () => agenteIaService.obtenerConfig(),
    enabled,
  });
}

export function useAgenteIaDocumentosQuery(enabled = true) {
  return useQuery({
    queryKey: AGENTE_IA_DOCUMENTOS_KEY,
    queryFn: () => agenteIaService.listarDocumentos(),
    enabled,
  });
}

function esConversationIdValido(conversationId: string | number | null | undefined): boolean {
  if (conversationId == null) return false;
  const raw = String(conversationId).trim();
  return /^\d+$/.test(raw);
}

export function useAgenteSesionQuery(conversationId: string | number | null | undefined, enabled = true) {
  const idValido = esConversationIdValido(conversationId);
  return useQuery({
    queryKey: agenteSesionQueryKey(conversationId),
    queryFn: () => agenteIaService.obtenerSesion(conversationId!),
    enabled: enabled && idValido,
    refetchInterval: 15000,
  });
}

export function useActualizarAgenteConfigMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AgenteIaConfig>) => agenteIaService.actualizarConfig(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AGENTE_IA_CONFIG_KEY });
    },
  });
}

export function useReindexarAgenteConocimientoMutation() {
  return useMutation({
    mutationFn: () => agenteIaService.reindexarConocimiento(),
  });
}

export function usePausarAgenteSesionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string | number) => agenteIaService.pausarSesion(conversationId),
    onSuccess: (_data, conversationId) => {
      qc.invalidateQueries({ queryKey: agenteSesionQueryKey(conversationId) });
    },
  });
}

export function useReanudarAgenteSesionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string | number) => agenteIaService.reanudarSesion(conversationId),
    onSuccess: (_data, conversationId) => {
      qc.invalidateQueries({ queryKey: agenteSesionQueryKey(conversationId) });
    },
  });
}

export function sesionAgenteActiva(sesion: AgenteSesionEstado | null | undefined): boolean {
  if (!sesion) return false;
  if (sesion.activa === false) return false;
  if (sesion.pausado_por_taller) return false;
  return Boolean(sesion.activa || sesion.estado === 'capturando' || sesion.estado === 'listo_para_cotizar');
}

export const AGENTE_IA_BORRADORES_KEY = ['agente-ia-borradores-pendientes'] as const;

export function useAgenteBorradoresPendientesQuery(enabled = true) {
  return useQuery({
    queryKey: AGENTE_IA_BORRADORES_KEY,
    queryFn: () => agenteIaService.borradoresPendientes(),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

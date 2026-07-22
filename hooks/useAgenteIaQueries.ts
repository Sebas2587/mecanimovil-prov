import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import agenteIaService, { type AgenteIaConfig, type AgenteSesionEstado } from '@/services/agenteIaService';

export const AGENTE_IA_CONFIG_KEY = ['agente-ia-config'] as const;
export const AGENTE_IA_DOCUMENTOS_KEY = ['agente-ia-documentos'] as const;

export function agenteSesionQueryKey(conversationId: string | number | null | undefined) {
  // Normaliza a string para que "24" y 24 no generen caches distintas.
  return ['agente-ia-sesion', conversationId == null ? null : String(conversationId)] as const;
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
    // Evita que un refetch en curso deje el toggle en blanco/apagado.
    placeholderData: (prev) => prev,
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

export function useActivarAgenteEnChatMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      activo,
    }: {
      conversationId: string | number;
      activo: boolean;
    }) => agenteIaService.activarEnChat(conversationId, activo),
    onMutate: async (vars) => {
      const key = agenteSesionQueryKey(vars.conversationId);
      // Cancela GETs en vuelo: un /sesion/ antiguo con habilitado=false
      // no debe pisar el estado justo después de activar.
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<AgenteSesionEstado>(key);
      qc.setQueryData<AgenteSesionEstado>(key, (old) => ({
        ...(old || {}),
        habilitado_en_chat: vars.activo,
        pausado_por_taller: vars.activo ? false : Boolean(old?.pausado_por_taller),
        pausado_hasta: vars.activo ? null : old?.pausado_hasta ?? null,
        activa: vars.activo,
        estado: vars.activo ? 'capturando' : 'pausado_por_taller',
        agente_ia_disponible_en_plan: old?.agente_ia_disponible_en_plan ?? true,
      }));
      return { previous, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSuccess: (data, vars) => {
      const key = agenteSesionQueryKey(vars.conversationId);
      // Merge con cache: el POST a veces omite flags; no borrar plan/estado previo.
      qc.setQueryData<AgenteSesionEstado>(key, (old) => ({
        ...(old || {}),
        ...data,
        habilitado_en_chat:
          typeof data?.habilitado_en_chat === 'boolean'
            ? data.habilitado_en_chat
            : vars.activo,
        pausado_por_taller: vars.activo
          ? false
          : Boolean(data?.pausado_por_taller ?? old?.pausado_por_taller),
        activa:
          typeof data?.activa === 'boolean'
            ? data.activa
            : vars.activo,
      }));
    },
    // No invalidate inmediato: un refetch concurrente era lo que apagaba el switch solo.
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
    onMutate: async (conversationId) => {
      const key = agenteSesionQueryKey(conversationId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<AgenteSesionEstado>(key);
      qc.setQueryData<AgenteSesionEstado>(key, (old) => ({
        ...(old || {}),
        habilitado_en_chat: true,
        pausado_por_taller: false,
        pausado_hasta: null,
        activa: true,
        estado: 'capturando',
      }));
      return { previous, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSuccess: (_data, conversationId) => {
      const key = agenteSesionQueryKey(conversationId);
      qc.setQueryData<AgenteSesionEstado>(key, (old) => ({
        ...(old || {}),
        habilitado_en_chat: true,
        pausado_por_taller: false,
        pausado_hasta: null,
        activa: true,
        estado: 'capturando',
      }));
    },
  });
}

export function sesionAgenteActiva(sesion: AgenteSesionEstado | null | undefined): boolean {
  if (!sesion) return false;
  if (sesion.habilitado_en_chat === false) return false;
  if (sesion.activa === false) return false;
  if (sesion.pausado_por_taller) return false;
  return Boolean(
    sesion.habilitado_en_chat
      || sesion.activa
      || sesion.estado === 'capturando'
      || sesion.estado === 'listo_para_cotizar',
  );
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

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  agendaProveedorService,
  enriquecerCitaConTecnico,
  type CitaAgendaPersonal,
} from '@/services/agendaProveedorService';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

export function citaPersonalQueryKey(citaId: number | null | undefined) {
  if (citaId == null || Number.isNaN(citaId)) return null;
  return ['cita-personal', citaId] as const;
}

export async function fetchCitaPersonalBundle(citaId: number): Promise<CitaAgendaPersonal> {
  const res = await agendaProveedorService.obtenerCita(citaId);
  if (!res.success || !res.data) {
    throw new Error(res.message || 'No se pudo cargar la cita.');
  }
  return enriquecerCitaConTecnico(res.data);
}

export function findCitaPersonalSeed(
  queryClient: QueryClient,
  citaId: number,
): CitaAgendaPersonal | undefined {
  const activas = queryClient.getQueryData<CitaAgendaPersonal[]>(['citas-activas-proveedor']);
  const fromActivas = activas?.find((c) => c.id === citaId);
  if (fromActivas) return fromActivas;

  const agenda = queryClient.getQueryData<{
    cerradas: CitaAgendaPersonal[];
    canceladas: CitaAgendaPersonal[];
  }>(['citas-agenda-proveedor']);
  const fromHistorial = [
    ...(agenda?.cerradas ?? []),
    ...(agenda?.canceladas ?? []),
  ].find((c) => c.id === citaId);
  if (fromHistorial) return fromHistorial;

  return undefined;
}

export function prefetchCitaPersonal(
  queryClient: QueryClient,
  citaId: number,
  seed?: CitaAgendaPersonal | null,
) {
  const key = citaPersonalQueryKey(citaId);
  if (!key) return Promise.resolve();

  const resolvedSeed = seed ?? findCitaPersonalSeed(queryClient, citaId);
  if (resolvedSeed) {
    queryClient.setQueryData(key, resolvedSeed);
  }

  return queryClient.prefetchQuery({
    queryKey: key,
    queryFn: () => fetchCitaPersonalBundle(citaId),
    staleTime: DASHBOARD_QUERY_STALE_MS,
  });
}

export function useCitaPersonalQuery(citaId: number | null | undefined) {
  const key = citaPersonalQueryKey(citaId);

  return useQuery({
    queryKey: key ?? ['cita-personal', '__disabled__'],
    queryFn: () => fetchCitaPersonalBundle(Number(citaId)),
    enabled: key != null,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (previous) => previous,
  });
}

export function patchCitaPersonalCache(
  queryClient: QueryClient,
  citaId: number,
  cita: CitaAgendaPersonal,
) {
  const key = citaPersonalQueryKey(citaId);
  if (!key) return;
  queryClient.setQueryData(key, cita);
}

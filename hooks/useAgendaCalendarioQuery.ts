import { useQuery } from '@tanstack/react-query';
import {
  agendaProveedorService,
  type EventoAgendaUnificado,
} from '@/services/agendaProveedorService';
import { formatDateApi } from '@/components/solicitudes/CatalogoFechaHoraPickers';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

export function rangoMesCalendario(mes: Date): { desde: string; hasta: string } {
  const year = mes.getFullYear();
  const month = mes.getMonth();
  const primerDia = new Date(year, month, 1);
  const diaInicioSemana = primerDia.getDay();
  const diaInicioAjustado = diaInicioSemana === 0 ? 6 : diaInicioSemana - 1;
  const inicioGrid = new Date(year, month, 1 - diaInicioAjustado);
  const finGrid = new Date(inicioGrid);
  finGrid.setDate(inicioGrid.getDate() + 41);
  return {
    desde: formatDateApi(inicioGrid),
    hasta: formatDateApi(finGrid),
  };
}

export function agendaCalendarioQueryKey(mes: Date, miembroFiltro: number | null) {
  const mesKey = `${mes.getFullYear()}-${mes.getMonth()}`;
  return ['agenda-calendario', mesKey, miembroFiltro ?? 'all'] as const;
}

type Options = {
  mesActual: Date;
  miembroFiltro: number | null;
  enabled?: boolean;
};

export function useAgendaCalendarioQuery({ mesActual, miembroFiltro, enabled = true }: Options) {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: agendaCalendarioQueryKey(mesActual, miembroFiltro),
    queryFn: async (): Promise<EventoAgendaUnificado[]> => {
      const { desde, hasta } = rangoMesCalendario(mesActual);
      const result = await agendaProveedorService.obtenerAgendaUnificada({
        fecha_desde: desde,
        fecha_hasta: hasta,
        incluir: 'activas,cerradas,mecanimovil',
        miembro_taller: miembroFiltro,
      });
      if (!result.success || !result.data) {
        throw new Error('No se pudo cargar la agenda');
      }
      return result.data;
    },
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
  });

  return {
    eventos: data ?? [],
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}

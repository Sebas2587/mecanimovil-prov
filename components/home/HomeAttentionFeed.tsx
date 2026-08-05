import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { usePipelineComercialQuery } from '@/hooks/usePipelineComercialQuery';
import { useCotizacionesCanalTallerQuery } from '@/hooks/useCotizacionesCanalTallerQuery';
import { useAgenteBorradoresPendientesQuery } from '@/hooks/useAgenteIaQueries';
import { invalidateProveedorComercialQueries } from '@/utils/invalidateProveedorComercial';
import websocketService from '@/app/services/websocketService';
import { SPACING } from '@/app/design-system/tokens';
import { HomePrimaryActions } from './HomePrimaryActions';
import { HomePendientesRevisionList } from './HomePendientesRevisionList';

const ESTADOS_BANDEJA = new Set(['nuevo', 'cotizacion_enviada', 'en_negociacion']);

interface HomeAttentionFeedProps {
  enabled?: boolean;
  refreshing?: boolean;
  onRefreshFeed?: () => void;
  onAgendar?: () => void;
}

export function HomeAttentionFeed({
  enabled = true,
  refreshing = false,
  onRefreshFeed,
}: HomeAttentionFeedProps) {
  const queryClient = useQueryClient();

  const pipelineQuery = usePipelineComercialQuery(
    { limite: 100, fetchAllEstados: true },
    { enabled },
  );
  const cotizacionesQuery = useCotizacionesCanalTallerQuery(enabled);
  const borradoresQuery = useAgenteBorradoresPendientesQuery(enabled);

  const cotizaciones = useMemo(
    () => cotizacionesQuery.data ?? [],
    [cotizacionesQuery.data],
  );

  const borradoresCount = useMemo(() => {
    if (typeof borradoresQuery.data?.count === 'number') {
      return borradoresQuery.data.count;
    }
    return cotizaciones.filter((c) => c.estado === 'borrador').length;
  }, [borradoresQuery.data?.count, cotizaciones]);

  const bandejaCount = useMemo(() => {
    if (!pipelineQuery.data?.results) return 0;
    return pipelineQuery.data.results.filter((row) =>
      ESTADOS_BANDEJA.has(row.estado_normalizado),
    ).length;
  }, [pipelineQuery.data?.results]);

  const refreshAll = useCallback(async () => {
    invalidateProveedorComercialQueries(queryClient);
    await Promise.all([
      pipelineQuery.refetch(),
      cotizacionesQuery.refetch(),
      borradoresQuery.refetch(),
    ]);
    onRefreshFeed?.();
  }, [queryClient, pipelineQuery, cotizacionesQuery, borradoresQuery, onRefreshFeed]);

  useEffect(() => {
    if (refreshing) {
      void refreshAll();
    }
  }, [refreshing, refreshAll]);

  useEffect(() => {
    if (!enabled) return;

    const unsubIa = websocketService.onAgenteIaEvent(() => {
      invalidateProveedorComercialQueries(queryClient);
    });
    const unsubMensaje = websocketService.onNuevoMensajeChat?.(() => {
      invalidateProveedorComercialQueries(queryClient);
    });
    const unsubSolicitud = websocketService.onNuevaSolicitud(() => {
      invalidateProveedorComercialQueries(queryClient);
    });

    return () => {
      unsubIa();
      unsubMensaje?.();
      unsubSolicitud();
    };
  }, [enabled, queryClient]);

  if (!enabled) return null;

  return (
    <View style={styles.feedContainer}>
      <HomePrimaryActions
        borradoresCount={borradoresCount}
        bandejaCount={bandejaCount}
      />

      <HomePendientesRevisionList
        cotizaciones={cotizaciones}
        loading={cotizacionesQuery.isPending && cotizaciones.length === 0}
        onRefresh={refreshAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  feedContainer: {
    flex: 1,
    gap: SPACING.lg,
  },
});

export default HomeAttentionFeed;

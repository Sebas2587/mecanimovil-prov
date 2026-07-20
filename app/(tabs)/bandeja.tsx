import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, RefreshControl, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import PipelineSeguimientoSection from '@/components/pipeline/PipelineSeguimientoSection';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import type { OrigenPipeline } from '@/services/pipelineComercialService';

const I = COLORS.institutional;

/**
 * Tab principal de administración comercial (inbox helpdesk).
 * Acceso siempre visible en la barra inferior — no depende de un link en Hoy.
 */
export default function BandejaTabScreen() {
  const params = useLocalSearchParams<{ filtro?: string | string[]; origen?: string | string[] }>();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const filtroParam = Array.isArray(params.filtro) ? params.filtro[0] : params.filtro;
  const origenParam = Array.isArray(params.origen) ? params.origen[0] : params.origen;
  const filtroEsperando24h = filtroParam === 'esperando_24h';

  const filtroOrigen = useMemo((): OrigenPipeline | undefined => {
    if (!origenParam) return undefined;
    const valid: OrigenPipeline[] = [
      'marketplace',
      'catalogo',
      'whatsapp',
      'instagram',
      'messenger',
      'canal',
      'manual',
    ];
    return valid.includes(origenParam as OrigenPipeline)
      ? (origenParam as OrigenPipeline)
      : undefined;
  }, [origenParam]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setRefreshKey((k) => k + 1);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <TabScreenWrapper>
      <View style={styles.screen}>
        <Header title="Bandeja" />
        <View style={styles.body}>
          <PipelineSeguimientoSection
            compact={false}
            limite={100}
            hideTitle
            filtroEsperando24h={filtroEsperando24h}
            filtroOrigen={filtroOrigen}
            refreshKey={refreshKey}
            listRefreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={I.primary}
              />
            }
          />
        </View>
      </View>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: I.surfaceSoft },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.fixed.sm,
  },
});

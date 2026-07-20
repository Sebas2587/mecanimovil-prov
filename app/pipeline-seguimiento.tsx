import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { navigateBack } from '@/utils/navigateBack';
import PipelineSeguimientoSection from '@/components/pipeline/PipelineSeguimientoSection';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import type { OrigenPipeline } from '@/services/pipelineComercialService';

const I = COLORS.institutional;

export default function PipelineSeguimientoScreen() {
  const params = useLocalSearchParams<{ filtro?: string; origen?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const filtroEsperando24h = params.filtro === 'esperando_24h';

  const filtroOrigen = useMemo((): OrigenPipeline | undefined => {
    const o = params.origen;
    if (!o) return undefined;
    const valid: OrigenPipeline[] = [
      'marketplace',
      'catalogo',
      'whatsapp',
      'instagram',
      'messenger',
      'canal',
      'manual',
    ];
    return valid.includes(o as OrigenPipeline) ? (o as OrigenPipeline) : undefined;
  }, [params.origen]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setRefreshKey((k) => k + 1);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title="Seguimiento comercial"
        showBack
        onBackPress={() => navigateBack('/(tabs)')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} />
        }
      >
        <InstitutionalText role="caption" color="muted" style={styles.subtitle}>
          Embudo completo del taller: filtra por estado y origen (Mecanimovil, WhatsApp, Instagram, citas personales). Los cerrados/perdidos solo viven aquí, no en el inicio.
        </InstitutionalText>
        <PipelineSeguimientoSection
          compact={false}
          limite={100}
          filtroEsperando24h={filtroEsperando24h}
          filtroOrigen={filtroOrigen}
          refreshKey={refreshKey}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: I.surfaceSoft },
  content: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.fixed.md,
    paddingBottom: SPACING.fixed['2xl'],
  },
  subtitle: { marginBottom: SPACING.fixed.md },
});

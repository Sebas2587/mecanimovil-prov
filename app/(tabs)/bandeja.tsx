import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import PipelineSeguimientoSection from '@/components/pipeline/PipelineSeguimientoSection';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { hostScreenStyles } from '@/app/design-system/components';
import type { OrigenPipeline, EstadoPipelineNormalizado } from '@/services/pipelineComercialService';

const I = COLORS.institutional;

const ESTADOS_FILTRO_URL: EstadoPipelineNormalizado[] = [
  'nuevo',
  'cotizacion_enviada',
  'en_negociacion',
  'aceptado_agendado',
  'rechazado_perdido',
  'en_ejecucion',
  'completado',
];

export default function BandejaTabScreen() {
  const params = useLocalSearchParams<{ filtro?: string | string[]; origen?: string | string[] }>();

  const filtroParam = Array.isArray(params.filtro) ? params.filtro[0] : params.filtro;
  const origenParam = Array.isArray(params.origen) ? params.origen[0] : params.origen;
  const filtroEsperando24h = filtroParam === 'esperando_24h';

  const filtroEstadoInicial = useMemo((): EstadoPipelineNormalizado | undefined => {
    if (!filtroParam || filtroEsperando24h) return undefined;
    return ESTADOS_FILTRO_URL.includes(filtroParam as EstadoPipelineNormalizado)
      ? (filtroParam as EstadoPipelineNormalizado)
      : undefined;
  }, [filtroParam, filtroEsperando24h]);

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
      'directo',
    ];
    return valid.includes(origenParam as OrigenPipeline)
      ? (origenParam as OrigenPipeline)
      : undefined;
  }, [origenParam]);

  return (
    <TabScreenWrapper>
      <View style={styles.screen}>
        <Header title="Bandeja Comercial" backgroundColor={I.canvas} titleColor={I.ink} />
        <View style={[styles.body, hostScreenStyles.scroll]}>
          <PipelineSeguimientoSection
            compact={false}
            limite={100}
            hideTitle
            filtroEsperando24h={filtroEsperando24h}
            filtroEstadoInicial={filtroEstadoInicial}
            filtroOrigen={filtroOrigen}
          />
        </View>
      </View>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: I.canvas },
  body: {
    flex: 1,
    paddingTop: SPACING.fixed.sm,
  },
});

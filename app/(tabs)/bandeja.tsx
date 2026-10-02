import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import PipelineClientesSection from '@/components/pipeline/PipelineClientesSection';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { hostScreenStyles } from '@/app/design-system/components';
import type { OrigenPipeline, PrioridadClientePipeline } from '@/services/pipelineComercialService';
import { esPasoComercial, type PasoComercial } from '@/utils/pasoComercial';
import { navigateBack } from '@/utils/navigateBack';

const I = COLORS.institutional;

export default function BandejaTabScreen() {
  const params = useLocalSearchParams<{
    filtro?: string | string[];
    origen?: string | string[];
    q?: string | string[];
    paso?: string | string[];
  }>();

  const filtroParam = Array.isArray(params.filtro) ? params.filtro[0] : params.filtro;
  const origenParam = Array.isArray(params.origen) ? params.origen[0] : params.origen;
  const qParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const filtroEsperando24h = filtroParam === 'esperando_24h';
  const filtroPorAgendar = filtroParam === 'por_agendar';
  const pasoParam = Array.isArray(params.paso) ? params.paso[0] : params.paso;

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

  const prioridadInicial = useMemo((): PrioridadClientePipeline => {
    if (filtroEsperando24h || filtroPorAgendar) return 'con_accion';
    return 'todos';
  }, [filtroEsperando24h, filtroPorAgendar]);

  const pasoInicial = useMemo((): PasoComercial | undefined => {
    if (esPasoComercial(pasoParam)) return pasoParam;
    if (filtroPorAgendar) return 'por_agendar';
    if (filtroEsperando24h) return 'esperando';
    return undefined;
  }, [filtroEsperando24h, filtroPorAgendar, pasoParam]);

  const handleBack = useCallback(() => {
    navigateBack('/(tabs)');
  }, []);

  return (
    <TabScreenWrapper>
      <View style={styles.screen}>
        <Header
          title="Clientes"
          showBack
          onBackPress={handleBack}
          backgroundColor={I.canvas}
          titleColor={I.ink}
        />
        <View style={[styles.body, hostScreenStyles.scroll]}>
          <PipelineClientesSection
            limite={100}
            filtroOrigen={filtroOrigen}
            busquedaInicial={qParam?.trim() || ''}
            prioridadInicial={prioridadInicial}
            pasoInicial={pasoInicial}
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

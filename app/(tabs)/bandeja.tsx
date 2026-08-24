import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import PipelineClientesSection from '@/components/pipeline/PipelineClientesSection';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { hostScreenStyles } from '@/app/design-system/components';
import type { OrigenPipeline, PrioridadClientePipeline } from '@/services/pipelineComercialService';

const I = COLORS.institutional;

export default function BandejaTabScreen() {
  const params = useLocalSearchParams<{
    filtro?: string | string[];
    origen?: string | string[];
    q?: string | string[];
  }>();

  const filtroParam = Array.isArray(params.filtro) ? params.filtro[0] : params.filtro;
  const origenParam = Array.isArray(params.origen) ? params.origen[0] : params.origen;
  const qParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const filtroEsperando24h = filtroParam === 'esperando_24h';
  const filtroPorAgendar = filtroParam === 'por_agendar';

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

  const hintConAccion = filtroEsperando24h
    ? 'Clientes con cotizaciones sin respuesta. Entra a la ficha para abrir el folio o cerrar el caso.'
    : filtroPorAgendar
      ? 'Clientes con una cotización aceptada que aún no tiene horario.'
      : undefined;

  return (
    <TabScreenWrapper>
      <View style={styles.screen}>
        <Header title="Bandeja Comercial" backgroundColor={I.canvas} titleColor={I.ink} />
        <View style={[styles.body, hostScreenStyles.scroll]}>
          <PipelineClientesSection
            limite={100}
            filtroOrigen={filtroOrigen}
            busquedaInicial={qParam?.trim() || ''}
            prioridadInicial={prioridadInicial}
            hintConAccion={hintConAccion}
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

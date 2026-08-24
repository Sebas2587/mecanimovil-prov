import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList } from 'lucide-react-native';
import Header from '@/components/Header';
import {
  HostEmptyState,
  HostPaperSection,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/design-system/components/InstitutionalButton';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { useHistorialRedQuery } from '@/hooks/useHistorialRedQuery';
import {
  compactarPatente,
  patenteHistorialValida,
  type HistorialRedEvento,
} from '@/services/vehiculoService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const T = TYPOGRAPHY.styles;

function anioDeFecha(fecha: string | null): string {
  if (!fecha) return 'Sin fecha';
  const anio = fecha.slice(0, 4);
  return /^\d{4}$/.test(anio) ? anio : 'Sin fecha';
}

function formatearFechaEvento(fecha: string | null): string {
  if (!fecha) return 'Fecha no registrada';
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return fecha.slice(0, 10);
  return parsed.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const EventoPaper = React.memo(function EventoPaper({ evento }: { evento: HistorialRedEvento }) {
  const km =
    evento.kilometraje != null && evento.kilometraje > 0
      ? `${evento.kilometraje.toLocaleString('es-CL')} km`
      : null;
  const monto =
    evento.taller_es_propio && evento.monto_clp != null
      ? formatearMontoCLP(evento.monto_clp)
      : null;
  const rango =
    !evento.taller_es_propio
    && evento.rango_mercado_clp
    && evento.rango_mercado_clp.min != null
    && evento.rango_mercado_clp.max != null
      ? `En la red: ${formatearMontoCLP(evento.rango_mercado_clp.min)} – ${formatearMontoCLP(evento.rango_mercado_clp.max)}`
      : null;

  return (
    <HostPaperSection>
      <View style={styles.eventoTop}>
        <Text style={styles.servicio} numberOfLines={3}>
          {evento.servicio_nombre || 'Servicio'}
        </Text>
        <InstitutionalTag
          label={evento.taller_es_propio ? 'Tu taller' : evento.taller_nombre || 'Taller de la red'}
          variant={evento.taller_es_propio ? 'success' : 'neutral'}
          size="sm"
        />
      </View>
      <Text style={styles.meta}>
        {[formatearFechaEvento(evento.fecha), km].filter(Boolean).join(' · ')}
      </Text>
      {monto ? <Text style={styles.monto}>{monto}</Text> : null}
      {rango ? <Text style={styles.rango}>{rango}</Text> : null}
    </HostPaperSection>
  );
});

export default function HistorialPatenteScreen() {
  const raw = useLocalSearchParams<{ patente?: string | string[] }>().patente;
  const patente = compactarPatente(Array.isArray(raw) ? raw[0] : raw || '');
  const insets = useSafeAreaInsets();
  const valida = patenteHistorialValida(patente);
  const { data, isPending, isError, refetch } = useHistorialRedQuery(valida ? patente : undefined);

  const grupos = useMemo(() => {
    const eventos = data?.eventos || [];
    const map = new Map<string, HistorialRedEvento[]>();
    for (const evento of eventos) {
      const anio = anioDeFecha(evento.fecha);
      const lista = map.get(anio) || [];
      lista.push(evento);
      map.set(anio, lista);
    }
    return Array.from(map.entries());
  }, [data?.eventos]);

  const vehiculoTxt = [data?.vehiculo?.marca, data?.vehiculo?.modelo, data?.vehiculo?.anio]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title={patente || 'Historial de la patente'}
        backgroundColor={I.canvas}
        titleColor={I.ink}
        showBack
        onBackPress={() => router.back()}
      />
      {!valida ? (
        <View style={styles.centered}>
          <InstitutionalText role="bodyBold">Indica una patente válida</InstitutionalText>
          <InstitutionalText role="caption" color="muted">
            El historial de la red se consulta con una patente chilena (5 a 8 caracteres).
          </InstitutionalText>
        </View>
      ) : isPending && !data ? (
        <View style={styles.centered}>
          <ActivityIndicator color={I.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <InstitutionalText role="bodyBold">No pudimos cargar el historial</InstitutionalText>
          <InstitutionalButton
            label="Reintentar"
            variant="outline"
            size="compact"
            onPress={() => void refetch()}
          />
        </View>
      ) : (
        <ScrollView
          style={hostScreenStyles.scroll}
          contentContainerStyle={[
            hostScreenStyles.scrollInner,
            styles.scrollInner,
            { paddingBottom: insets.bottom + SPACING.fixed['2xl'] },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {vehiculoTxt ? (
            <InstitutionalText role="caption" color="muted">
              {vehiculoTxt}
            </InstitutionalText>
          ) : null}

          {grupos.length === 0 ? (
            <HostEmptyState
              icon={ClipboardList}
              title="Sin servicios de la red"
              description="Aún no hay servicios de la red para esta patente."
            />
          ) : (
            grupos.map(([anio, eventos]) => (
              <View key={anio} style={styles.anioBlock}>
                <HostSectionKicker label={anio} />
                {eventos.map((evento) => (
                  <EventoPaper key={evento.evento_id} evento={evento} />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: I.canvas },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.lg,
  },
  scrollInner: {
    gap: SPACING.fixed.md,
  },
  anioBlock: {
    gap: SPACING.fixed.sm,
  },
  eventoTop: {
    gap: SPACING.fixed.xs,
  },
  servicio: {
    fontFamily: FF.sansSemiBold,
    fontSize: T.h4.fontSize,
    color: I.ink,
    lineHeight: Math.round(T.h4.fontSize * 1.25),
  },
  meta: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
  },
  monto: {
    fontFamily: FF.monoMedium,
    fontSize: T.body.fontSize,
    color: I.ink,
    alignSelf: 'flex-end',
  },
  rango: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
  },
});

import React, { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import {
  HostPaperSection,
  HostSectionKicker,
  InstitutionalTag,
  InstitutionalText,
  hostIconPlateStyle,
} from '@/app/design-system/components';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';
import { CotizacionPendienteRow } from './CotizacionPendienteRow';

const I = COLORS.institutional;

export type HomePendientesRevisionListProps = {
  cotizaciones: CotizacionCanal[];
  loading?: boolean;
  onRefresh: () => void;
};

function HomePendientesRevisionListInner({
  cotizaciones,
  loading = false,
}: HomePendientesRevisionListProps) {
  const borradores = useMemo(
    () => cotizaciones.filter((c) => c.estado === 'borrador' && Boolean(c.id)),
    [cotizaciones],
  );

  const open = useCallback((item: CotizacionCanal) => {
    if (item.id) router.push(`/cotizacion-canal/${item.id}`);
  }, []);

  if (loading && borradores.length === 0) {
    return (
      <View style={styles.section}>
        <HostSectionKicker label="Cotizaciones pendientes de revisión" />
        <HostPaperSection>
          <View style={styles.loadingBox}>
            <ActivityIndicator color={I.primary} size="small" />
          </View>
        </HostPaperSection>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <HostSectionKicker label="Cotizaciones pendientes de revisión" />
        {borradores.length > 0 ? (
          <InstitutionalTag label={`${borradores.length}`} variant="warning" size="sm" />
        ) : null}
      </View>

      {borradores.length === 0 ? (
        <HostPaperSection>
          <View style={styles.emptyWrap}>
            <View style={hostIconPlateStyle}>
              <Sparkles size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.emptyCopy}>
              <InstitutionalText role="bodyBold">Sin borradores por revisar</InstitutionalText>
              <InstitutionalText role="caption" color="body">
                Cuando la IA arme una cotización, aparece aquí. Al aprobarla pasa a Bandeja.
              </InstitutionalText>
            </View>
          </View>
        </HostPaperSection>
      ) : (
        <HostPaperSection>
          {borradores.map((item, index) => (
            <CotizacionPendienteRow
              key={item.id}
              item={item}
              onPress={open}
              last={index === borradores.length - 1}
            />
          ))}
        </HostPaperSection>
      )}
    </View>
  );
}

export const HomePendientesRevisionList = memo(HomePendientesRevisionListInner);

const styles = StyleSheet.create({
  section: {
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  loadingBox: {
    paddingVertical: SPACING.fixed.lg,
    alignItems: 'center',
  },
  emptyWrap: {
    flexDirection: 'row',
    gap: SPACING.fixed.md,
    alignItems: 'flex-start',
  },
  emptyCopy: {
    flex: 1,
    gap: SPACING.fixed.xs,
  },
});

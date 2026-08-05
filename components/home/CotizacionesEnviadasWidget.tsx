import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Send, Bot, ChevronRight } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import {
  HostSectionKicker,
  HostPaperSection,
  InstitutionalTag,
  InstitutionalText,
  hostIconPlateStyle,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { router } from 'expo-router';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;

interface CotizacionesEnviadasWidgetProps {
  cotizaciones: CotizacionCanal[];
}

export function CotizacionesEnviadasWidget({ cotizaciones }: CotizacionesEnviadasWidgetProps) {
  const enviadas = useMemo(() => {
    return cotizaciones.filter((c) => c.estado === 'enviada');
  }, [cotizaciones]);

  const totalMontoEnviado = useMemo(() => {
    return enviadas.reduce((acc, curr) => acc + (Number(curr.total_clp) || 0), 0);
  }, [enviadas]);

  const handleIrABandeja = useCallback(() => {
    router.push('/(tabs)/bandeja');
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <HostSectionKicker label="Seguimiento IA — Cotizaciones Enviadas" />
        <TouchableOpacity onPress={handleIrABandeja} activeOpacity={0.7}>
          <InstitutionalText role="navLink" color="primary">
            Ver Bandeja
          </InstitutionalText>
        </TouchableOpacity>
      </View>

      <HostPaperSection style={styles.paperBox}>
        <View style={styles.kpiRow}>
          <View style={hostIconPlateStyle}>
            <Send size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <View style={{ flex: 1 }}>
            <InstitutionalText role="h2">{formatearMontoCLP(totalMontoEnviado)}</InstitutionalText>
            <InstitutionalText role="caption" color="body">
              {enviadas.length} {enviadas.length === 1 ? 'cotización enviada' : 'cotizaciones enviadas'} en negociación activa
            </InstitutionalText>
          </View>
        </View>

        <View style={styles.aiStatusBox}>
          <Bot size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} style={{ marginRight: 6 }} />
          <InstitutionalText role="caption" style={styles.aiStatusText}>
            La IA realiza retomas y recordatorios por WhatsApp automáticamente para agendar la cita.
          </InstitutionalText>
        </View>

        {enviadas.length > 0 ? (
          <View style={styles.itemsList}>
            {enviadas.slice(0, 3).map((item, idx) => (
              <View key={item.id || idx} style={styles.itemRow}>
                <View style={styles.itemBullet} />
                <View style={{ flex: 1 }}>
                  <InstitutionalText role="caption" numberOfLines={1}>
                    {item.cliente_nombre || 'Cliente'} • {item.vehiculo_marca} {item.vehiculo_modelo}
                  </InstitutionalText>
                  <InstitutionalText role="caption" color="body" numberOfLines={1}>
                    {item.servicio_nombre} ({formatearMontoCLP(item.total_clp)})
                  </InstitutionalText>
                </View>
                <InstitutionalTag label="Enviada" variant="info" size="sm" />
              </View>
            ))}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.fullBandejaBtn}
          onPress={handleIrABandeja}
          activeOpacity={0.8}
        >
          <InstitutionalText role="caption">Ver Pipeline Comercial Completo</InstitutionalText>
          <ChevronRight size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      </HostPaperSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.fixed.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.xs,
  },
  paperBox: {},
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.md,
    marginBottom: SPACING.fixed.sm,
  },
  aiStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  aiStatusText: {
    flex: 1,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: I.hairline,
    paddingTop: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: 4,
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: I.primary,
  },
  fullBandejaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    marginTop: 4,
    gap: 4,
  },
});

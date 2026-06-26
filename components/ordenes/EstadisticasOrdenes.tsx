import React from 'react';
import { View, StyleSheet } from 'react-native';
import { type EstadisticasProveedor } from '@/services/ordenesProveedor';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { SPACING } from '@/app/design-system/tokens';
import {
  institutionalCardStyles,
  institutionalStatusColors,
  type InstitutionalStatusTone,
} from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';

interface EstadisticasOrdenesProps {
  estadisticas: EstadisticasProveedor;
}

type StatItem = {
  icon: string;
  label: string;
  value: string;
  tone: InstitutionalStatusTone;
};

export const EstadisticasOrdenes: React.FC<EstadisticasOrdenesProps> = ({ estadisticas }) => {
  const estadisticasItems: StatItem[] = [
    {
      icon: 'assignment',
      label: 'Total',
      value: (estadisticas?.total_ordenes || 0).toString(),
      tone: 'neutral',
    },
    {
      icon: 'schedule',
      label: 'Pendientes',
      value: (estadisticas?.ordenes_pendientes || 0).toString(),
      tone: 'warning',
    },
    {
      icon: 'verified',
      label: 'Completadas',
      value: (estadisticas?.ordenes_completadas || 0).toString(),
      tone: 'success',
    },
    {
      icon: 'cancel',
      label: 'Rechazadas',
      value: (estadisticas?.ordenes_rechazadas || 0).toString(),
      tone: 'error',
    },
  ];

  const totalOrdenes = estadisticas?.total_ordenes || 0;
  const ordenesRechazadas = estadisticas?.ordenes_rechazadas || 0;
  const tasaAceptacion =
    totalOrdenes > 0 ? ((totalOrdenes - ordenesRechazadas) / totalOrdenes) * 100 : 0;

  return (
    <View style={[institutionalCardStyles.surface, institutionalCardStyles.surfacePadding, styles.container]}>
      <View style={styles.statsGrid}>
        {estadisticasItems.map((item, index) => {
          const status = institutionalStatusColors(item.tone);
          return (
            <View key={index} style={styles.statItem}>
              <InstitutionalIcon
                name={item.icon as any}
                size={20}
                color={status.icon}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              <InstitutionalText role="h2" color="ink" style={styles.statValue}>
                {item.value}
              </InstitutionalText>
              <InstitutionalText role="caption" color="muted" style={styles.statLabel}>
                {item.label}
              </InstitutionalText>
            </View>
          );
        })}
      </View>

      <View style={[institutionalCardStyles.divider, styles.metricsContainer]}>
        <View style={styles.metricItem}>
          <InstitutionalText role="caption" color="muted" style={styles.metricLabel}>
            Tasa de Aceptación
          </InstitutionalText>
          <InstitutionalText role="h4" color="semanticUp">
            {tasaAceptacion.toFixed(1)}%
          </InstitutionalText>
        </View>
        <View style={styles.metricItem}>
          <InstitutionalText role="caption" color="muted" style={styles.metricLabel}>
            Calificación Promedio
          </InstitutionalText>
          <InstitutionalText role="h4" color="primary">
            {Number(estadisticas?.calificacion_promedio || 0).toFixed(1)}★
          </InstitutionalText>
        </View>
      </View>

      <View style={[institutionalCardStyles.divider, styles.ingresoContainer]}>
        <InstitutionalText role="caption" color="muted" style={styles.metricLabel}>
          Ingresos del Mes
        </InstitutionalText>
        <InstitutionalText role="h4" color="semanticUp">
          ${Number(estadisticas?.ingresos_mes_actual || 0).toLocaleString('es-CL')}
        </InstitutionalText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.fixed.lg,
    marginVertical: SPACING.fixed.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    marginTop: SPACING.fixed.xxs,
  },
  statLabel: {
    marginTop: 2,
    textAlign: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.fixed.md,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    textAlign: 'center',
    marginBottom: SPACING.fixed.xxs,
  },
  ingresoContainer: {
    paddingTop: SPACING.fixed.md,
    alignItems: 'center',
  },
});

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ListRenderItem } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { Card, hostScreenStyles } from '@/app/design-system/components';
import { ConsumoCredito } from '@/services/creditosService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

interface HistorialConsumosProps {
  consumos: ConsumoCredito[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const HistorialConsumos: React.FC<HistorialConsumosProps> = ({
  consumos,
  onRefresh,
  refreshing = false,
}) => {
  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatearPrecio = (precio: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(precio);

  const renderItem: ListRenderItem<ConsumoCredito> = useCallback(
    ({ item }) => (
      <Card elevated padding="host" style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.iconPlate, { backgroundColor: I.surfaceStrong }]}>
            <InstitutionalIcon name="receipt" size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <View style={styles.cardTopText}>
            <Text style={[styles.cardTitle, { color: I.ink }]} numberOfLines={2}>
              {item.servicio_nombre}
            </Text>
            <Text style={[styles.cardMeta, { color: I.muted }]}>{formatearFecha(item.fecha_consumo)}</Text>
          </View>
          <View style={[styles.credPill, { backgroundColor: I.surfaceStrong }]}>
            <Text style={[styles.credPillText, { color: I.semanticDown }]}>−{item.creditos_consumidos}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: I.hairline }]} />

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: I.muted }]}>Precio por crédito</Text>
            <Text style={[styles.detailValueMono, { color: I.ink }]}>{formatearPrecio(item.precio_credito)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: I.muted }]}>Oferta</Text>
            <Text style={[styles.detailValueMono, { color: I.body }]} numberOfLines={1}>
              {item.oferta_id.length > 10 ? `${item.oferta_id.slice(0, 10)}…` : item.oferta_id}
            </Text>
          </View>
          {item.oferta ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: I.muted }]}>Detalle</Text>
              <Text style={[styles.detailValue, { color: I.body }]} numberOfLines={2}>
                {item.oferta}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>
    ),
    []
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.headerRow}>
          <View style={[styles.sectionPill, { backgroundColor: I.surfaceStrong }]}>
            <Text style={[styles.sectionPillText, { color: I.muted }]}>CONSUMOS</Text>
          </View>
          <Text style={[styles.headerCount, { color: I.body }]}>
            {consumos.length} {consumos.length === 1 ? 'registro' : 'registros'}
          </Text>
        </View>
        <Text style={[styles.headerHint, { color: I.body }]}>
          Créditos descontados al postularte a trabajos. Los importes son referencia del momento del consumo.
        </Text>
      </View>
    ),
    [consumos.length]
  );

  if (consumos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconPlate, { backgroundColor: I.surfaceSoft }]}>
          <InstitutionalIcon name="receipt" size={32} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <View style={[styles.emptyPill, { backgroundColor: I.surfaceStrong }]}>
          <Text style={[styles.emptyPillText, { color: I.muted }]}>CONSUMOS</Text>
        </View>
        <Text style={[styles.emptyTitle, { color: I.ink }]}>Sin consumos</Text>
        <Text style={[styles.emptySub, { color: I.body }]}>
          Cuando postules a ofertas, verás acá cada descuento de créditos.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={consumos}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={styles.listContent}
      style={styles.list}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: {
    ...hostScreenStyles.scrollInner,
    paddingBottom: SPACING['2xl'],
  },
  listHeader: {
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  sectionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
  },
  sectionPillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  headerCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
  headerHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    marginTop: 8,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
  card: {
    marginBottom: SPACING.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  iconPlate: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTopText: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  cardMeta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: 2,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
  credPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.sm,
    minWidth: 44,
    alignItems: 'center',
  },
  credPillText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: TYPOGRAPHY.fontWeight.medium as '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: SPACING.sm,
  },
  details: { gap: 8 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    textAlign: 'right',
    flex: 1,
  },
  detailValueMono: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: TYPOGRAPHY.fontWeight.medium as '500',
    textAlign: 'right',
    flexShrink: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['2xl'],
  },
  emptyIconPlate: {
    width: 64,
    height: 64,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
    marginBottom: SPACING.sm,
  },
  emptyPillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    marginTop: SPACING.xs,
    textAlign: 'center',
    maxWidth: 280,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
});

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import creditosService, { CompraCreditos } from '@/services/creditosService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

interface HistorialComprasProps {
  compras: CompraCreditos[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

type CompraSection = {
  kicker: string;
  hint?: string;
  data: CompraCreditos[];
  sectionIndex: number;
};

export const HistorialCompras: React.FC<HistorialComprasProps> = ({
  compras,
  onRefresh,
  refreshing = false,
}) => {
  const [procesando, setProcesando] = useState<number | null>(null);

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatearFechaCompleta = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getMetodoPagoDisplay = (item: CompraCreditos) => {
    if (item.metodo_pago_display) return item.metodo_pago_display;
    switch (item.metodo_pago) {
      case 'mercadopago':
        return 'Mercado Pago';
      case 'transferencia':
        return 'Transferencia';
      case 'migracion':
        return 'Migración';
      default:
        return item.metodo_pago || '—';
    }
  };

  const formatearPrecio = (precio: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(precio);

  const getEstadoInk = (estado: string) => {
    switch (estado) {
      case 'completada':
        return I.semanticUp;
      case 'pendiente':
        return I.accentYellow;
      case 'cancelada':
      case 'reembolsada':
        return I.semanticDown;
      default:
        return I.muted;
    }
  };

  const getMetodoPagoIcon = (metodo: string) => {
    switch (metodo) {
      case 'mercadopago':
        return 'credit-card';
      case 'transferencia':
        return 'account-balance';
      case 'migracion':
        return 'swap-horiz';
      default:
        return 'payment';
    }
  };

  const sections = useMemo((): CompraSection[] => {
    const pend = compras.filter((c) => c.estado === 'pendiente');
    const rest = compras.filter((c) => c.estado !== 'pendiente');
    const out: CompraSection[] = [];
    let idx = 0;
    if (pend.length > 0) {
      out.push({
        kicker: 'PENDIENTES',
        hint: 'Verificá el pago en Mercado Pago o cancelá si ya no aplica.',
        data: pend,
        sectionIndex: idx++,
      });
    }
    if (rest.length > 0) {
      out.push({
        kicker: 'REGISTRO',
        hint: 'Compras completadas, canceladas o reembolsadas.',
        data: rest,
        sectionIndex: idx++,
      });
    }
    return out;
  }, [compras]);

  const handleVerificarPago = async (compra: CompraCreditos) => {
    try {
      setProcesando(compra.id);
      const result = await creditosService.verificarPago(compra.id);

      if (result.success && result.data) {
        const { status, mensaje, creditos_acreditados } = result.data;

        if (creditos_acreditados) {
          Alert.alert('¡Pago confirmado!', mensaje, [{ text: 'Listo', onPress: onRefresh }]);
        } else if (status === 'rejected' || status === 'cancelled') {
          Alert.alert('Pago no exitoso', mensaje, [{ text: 'Entendido', onPress: onRefresh }]);
        } else {
          Alert.alert('Estado del pago', mensaje);
        }
      } else {
        Alert.alert('Error', result.error || 'No se pudo verificar el pago');
      }
    } catch {
      Alert.alert('Error', 'No se pudo verificar el estado del pago');
    } finally {
      setProcesando(null);
    }
  };

  const handleReintentarPago = async (compra: CompraCreditos) => {
    try {
      setProcesando(compra.id);
      const result = await creditosService.reintentarPago(compra.id);

      if (result.success && result.data && result.data.mercadopago) {
        const urlPago = result.data.mercadopago.init_point || result.data.mercadopago.sandbox_init_point;

        if (urlPago) {
          const canOpen = await Linking.canOpenURL(urlPago);
          if (canOpen) await Linking.openURL(urlPago);
          else Alert.alert('Error', 'No se pudo abrir Mercado Pago');
        }
      } else {
        Alert.alert('Error', result.error || 'No se pudo generar el link de pago');
      }
    } catch {
      Alert.alert('Error', 'No se pudo reintentar el pago');
    } finally {
      setProcesando(null);
    }
  };

  const handleCancelarCompra = async (compra: CompraCreditos) => {
    Alert.alert(
      'Cancelar compra',
      '¿Seguro que querés cancelar esta compra? Esta acción no se puede deshacer.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcesando(compra.id);
              const result = await creditosService.cancelarCompra(compra.id);

              if (result.success) {
                Alert.alert('Compra cancelada', 'Listo.', [{ text: 'OK', onPress: onRefresh }]);
              } else {
                Alert.alert('Error', result.error || 'No se pudo cancelar la compra');
              }
            } catch {
              Alert.alert('Error', 'No se pudo cancelar la compra');
            } finally {
              setProcesando(null);
            }
          },
        },
      ]
    );
  };

  const renderSectionHeader = ({ section }: { section: CompraSection }) => (
    <View
      style={[
        styles.sectionHeaderBlock,
        { marginTop: section.sectionIndex === 0 ? 0 : SPACING.lg },
      ]}
    >
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionPill, { backgroundColor: I.surfaceStrong }]}>
          <Text style={[styles.sectionPillText, { color: I.muted }]}>{section.kicker}</Text>
        </View>
        <Text style={[styles.sectionCount, { color: I.body }]}>
          {section.data.length} {section.data.length === 1 ? 'ítem' : 'ítems'}
        </Text>
      </View>
      {section.hint ? <Text style={[styles.sectionHint, { color: I.body }]}>{section.hint}</Text> : null}
    </View>
  );

  const renderItem = ({ item }: { item: CompraCreditos }) => {
      const isPendiente = item.estado === 'pendiente';
      const isMercadoPago = item.metodo_pago === 'mercadopago';
      const isProcessing = procesando === item.id;
      const estadoInk = getEstadoInk(item.estado);

      return (
        <View
          style={[
            styles.card,
            { backgroundColor: I.canvas, borderColor: I.hairline },
            SHADOWS.editorial,
          ]}
        >
          <View style={styles.cardTop}>
            <View style={[styles.iconPlate, { backgroundColor: I.surfaceStrong }]}>
              <InstitutionalIcon
                name="shopping-cart"
                size={20}
                color={estadoInk}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </View>
            <View style={styles.cardTopText}>
              <Text style={[styles.cardTitle, { color: I.ink }]} numberOfLines={2}>
                {item.paquete?.nombre || 'Recarga a medida'}
              </Text>
              <Text style={[styles.cardMeta, { color: I.muted }]}>{formatearFecha(item.fecha_compra)}</Text>
            </View>
            <View style={[styles.estadoPill, { backgroundColor: I.surfaceStrong }]}>
              <Text style={[styles.estadoPillText, { color: estadoInk }]}>{item.estado_display}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: I.hairline }]} />

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: I.muted }]}>Créditos</Text>
              <Text style={[styles.detailValueMono, { color: I.ink }]}>{item.cantidad_creditos}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: I.muted }]}>Total</Text>
              <Text style={[styles.detailValueMono, { color: I.ink }]}>
                {formatearPrecio(item.precio_total)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailRowLeft}>
                <InstitutionalIcon
                  name={getMetodoPagoIcon(item.metodo_pago)}
                  size={16}
                  color={I.muted}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
                <Text style={[styles.detailLabel, { color: I.muted, marginLeft: 6 }]}>Método</Text>
              </View>
              <View style={[styles.metodoPill, { backgroundColor: I.surfaceSoft, borderColor: I.hairline }]}>
                <Text style={[styles.metodoPillText, { color: I.body }]}>{getMetodoPagoDisplay(item)}</Text>
              </View>
            </View>
            {item.fecha_expiracion_creditos && item.estado === 'completada' ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: I.muted }]}>Vencimiento créditos</Text>
                <Text style={[styles.detailValue, { color: I.ink }]}>
                  {formatearFechaCompleta(item.fecha_expiracion_creditos)}
                </Text>
              </View>
            ) : null}
          </View>

          {isPendiente ? (
            <View style={[styles.actionsBlock, { borderTopColor: I.hairline }]}>
              {isProcessing ? (
                <View style={styles.loadingActions}>
                  <ActivityIndicator size="small" color={I.primary} />
                  <Text style={[styles.loadingText, { color: I.muted }]}>Procesando…</Text>
                </View>
              ) : (
                <>
                  <View style={[styles.callout, { backgroundColor: I.surfaceSoft, borderColor: I.hairline }]}>
                    <InstitutionalIcon name="info-outline" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={[styles.calloutText, { color: I.body }]}>
                      {isMercadoPago
                        ? 'Pago pendiente. Podés verificar o abrir Mercado Pago de nuevo.'
                        : 'Esperando confirmación de transferencia.'}
                    </Text>
                  </View>
                  <View style={styles.actionsRow}>
                    {isMercadoPago ? (
                      <>
                        <TouchableOpacity
                          style={[styles.btnPrimary, { backgroundColor: I.primary }]}
                          onPress={() => handleVerificarPago(item)}
                          activeOpacity={0.88}
                        >
                          <InstitutionalIcon name="refresh" size={16} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                          <Text style={[styles.btnPrimaryText, { color: I.onPrimary }]}>Verificar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btnSecondary, { backgroundColor: I.surfaceStrong, borderColor: I.hairline }]}
                          onPress={() => handleReintentarPago(item)}
                          activeOpacity={0.88}
                        >
                          <InstitutionalIcon name="payment" size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                          <Text style={[styles.btnSecondaryText, { color: I.ink }]}>Pagar</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.btnGhost, { borderColor: I.hairline }]}
                      onPress={() => handleCancelarCompra(item)}
                      activeOpacity={0.88}
                    >
                      <InstitutionalIcon name="close" size={16} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
                      <Text style={[styles.btnGhostText, { color: I.semanticDown }]}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ) : null}
        </View>
      );
  };

  if (compras.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconPlate, { backgroundColor: I.surfaceSoft }]}>
          <InstitutionalIcon name="shopping-cart" size={32} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <View style={[styles.emptyPill, { backgroundColor: I.surfaceStrong }]}>
          <Text style={[styles.emptyPillText, { color: I.muted }]}>COMPRAS</Text>
        </View>
        <Text style={[styles.emptyTitle, { color: I.ink }]}>Sin movimientos</Text>
        <Text style={[styles.emptySub, { color: I.body }]}>
          Tus compras de créditos y recargas aparecerán acá.
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      contentContainerStyle={styles.listContent}
      style={styles.list}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      SectionSeparatorComponent={() => null}
    />
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING['2xl'],
  },
  sectionHeaderBlock: {
    marginBottom: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  sectionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
  },
  sectionPillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  sectionCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
  sectionHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    marginTop: 6,
  },
  card: {
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    padding: SPACING.md,
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
    borderRadius: BORDERS.radius.full,
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
  estadoPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.pill,
    maxWidth: '42%',
  },
  estadoPillText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: SPACING.sm,
  },
  details: { gap: 8 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center' },
  detailLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    textAlign: 'right',
    flexShrink: 1,
  },
  detailValueMono: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: TYPOGRAPHY.fontWeight.medium as '500',
    textAlign: 'right',
  },
  metodoPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    maxWidth: '56%',
  },
  metodoPillText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontWeight: TYPOGRAPHY.fontWeight.medium as '500',
    textAlign: 'right',
  },
  actionsBlock: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loadingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    marginBottom: SPACING.sm,
  },
  calloutText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.pill,
    minHeight: 44,
  },
  btnPrimaryText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    minHeight: 44,
  },
  btnSecondaryText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  btnGhostText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
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
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
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

/**
 * Modal: servicios del sistema y créditos por postulación (API).
 * Estética institucional / referencia Coinbase: canvas, hairline, radio xl, sombra editorial,
 * números en mono, acento primario residual (spinner).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { SPACING, TYPOGRAPHY, COLORS, BORDERS, SHADOWS, withOpacity } from '@/app/design-system/tokens';
import creditosService, { type ServicioCreditoTablaRow } from '@/services/creditosService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

type Section = { title: string; data: ServicioCreditoTablaRow[] };

function buildSections(rows: ServicioCreditoTablaRow[]): Section[] {
  const byCr = new Map<number, ServicioCreditoTablaRow[]>();
  for (const r of rows) {
    const k = Number(r.creditos_requeridos) || 0;
    if (!byCr.has(k)) byCr.set(k, []);
    byCr.get(k)!.push(r);
  }
  for (const arr of byCr.values()) {
    arr.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }
  return [...byCr.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([creditos, data]) => ({
      title: `${creditos} crédito${creditos !== 1 ? 's' : ''} por postulación`,
      data,
    }));
}

function formatRef(clp: number): string {
  if (clp == null || clp <= 0) return '—';
  return `$${Math.round(clp).toLocaleString('es-CL')}`;
}

export interface TablaServiciosCreditosModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TablaServiciosCreditosModal: React.FC<TablaServiciosCreditosModalProps> = ({ visible, onClose }) => {
  const { height: winH } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filas, setFilas] = useState<ServicioCreditoTablaRow[]>([]);

  const sections = useMemo(() => buildSections(filas), [filas]);

  const screenH = winH > 120 ? winH : Dimensions.get('window').height;
  const maxH = Math.max(340, Math.min(screenH * 0.88, 620));
  const listMaxH = Math.max(220, maxH - 200);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await creditosService.obtenerTablaServiciosCreditos();
    if (res.success) {
      setFilas(Array.isArray(res.data) ? res.data : []);
    } else {
      setError(res.error ?? 'No se pudo cargar la tabla');
      setFilas([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) {
      setFilas([]);
      cargar();
    }
  }, [visible, cargar]);

  const renderRow = useCallback(
    (item: ServicioCreditoTablaRow) => (
      <View key={item.servicio_id} style={[styles.row, { borderBottomColor: I.hairline }]}>
        <Text style={[styles.nombre, { color: I.ink }]} numberOfLines={2}>
          {item.nombre}
        </Text>
        <Text style={[styles.ref, { color: I.body }]}>{formatRef(item.precio_referencia_clp)}</Text>
        <View style={[styles.credPill, { backgroundColor: I.surfaceStrong }]}>
          <Text style={[styles.credPillTxt, { color: I.ink }]}>{item.creditos_requeridos}</Text>
        </View>
      </View>
    ),
    []
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { backgroundColor: withOpacity(I.ink, 0.48) }]}>
        <Pressable style={styles.dismissHit} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheetWrap, { maxHeight: maxH }]}>
          <View
            style={[
              styles.card,
              {
                borderColor: I.hairline,
                backgroundColor: I.canvas,
                maxHeight: maxH,
                minHeight: 280,
              },
              SHADOWS.editorial,
            ]}
          >
            <View style={styles.inner}>
              <View style={styles.header}>
                <View style={styles.headerTextCol}>
                  <View style={[styles.kickerPill, { backgroundColor: I.surfaceStrong }]}>
                    <Text style={[styles.kickerPillTxt, { color: I.muted }]}>REFERENCIA</Text>
                  </View>
                  <Text style={[styles.title, { color: I.ink }]}>Servicios y créditos</Text>
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  style={[styles.closePlate, { backgroundColor: I.surfaceStrong }]}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                >
                  <InstitutionalIcon name="close" size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                </Pressable>
              </View>
              <Text style={[styles.sub, { color: I.body }]}>
                El precio de referencia es orientativo. Al postular se descuentan los créditos indicados.
              </Text>
              <View style={[styles.tableHead, { borderBottomColor: I.hairline }]}>
                <Text style={[styles.th, { flex: 1, color: I.muted }]}>Servicio</Text>
                <Text style={[styles.th, { width: 92, color: I.muted }]}>Ref. CLP</Text>
                <Text style={[styles.th, { width: 40, textAlign: 'right', color: I.muted }]}>Cr.</Text>
              </View>
              {loading ? (
                <View style={[styles.centerPad, { minHeight: listMaxH * 0.4 }]}>
                  <ActivityIndicator size="large" color={I.primary} />
                </View>
              ) : error ? (
                <View style={[styles.centerPad, { minHeight: listMaxH * 0.4 }]}>
                  <Text style={[styles.errorText, { color: I.semanticDown }]}>{error}</Text>
                </View>
              ) : filas.length === 0 ? (
                <View style={[styles.centerPad, { minHeight: listMaxH * 0.4 }]}>
                  <Text style={[styles.empty, { color: I.muted }]}>No hay servicios cargados.</Text>
                </View>
              ) : (
                <ScrollView
                  style={{ maxHeight: listMaxH }}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                >
                  {sections.map((section, sIdx) => (
                    <View key={section.title}>
                      <View
                        style={[
                          styles.sectionHead,
                          {
                            backgroundColor: I.surfaceSoft,
                            borderColor: I.hairline,
                            marginTop: sIdx > 0 ? SPACING.sm : SPACING.xs,
                          },
                        ]}
                      >
                        <View style={[styles.sectionIconPlate, { backgroundColor: I.surfaceStrong }]}>
                          <InstitutionalIcon name="layers" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                        </View>
                        <InstitutionalSectionHeader title={section.title} />
                        <Text style={[styles.sectionCount, { color: I.muted }]}>({section.data.length})</Text>
                      </View>
                      {section.data.map((item) => renderRow(item))}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  dismissHit: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 440,
    zIndex: 1,
    elevation: 8,
  },
  card: {
    width: '100%',
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    overflow: 'hidden',
    elevation: 4,
  },
  inner: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    width: '100%',
  },
  scrollContent: { paddingBottom: SPACING.md },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  headerTextCol: { flex: 1, minWidth: 0 },
  kickerPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    marginBottom: SPACING.xs,
  },
  kickerPillTxt: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    lineHeight: TYPOGRAPHY.fontSize.lg * 1.25,
  },
  sub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  closePlate: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    borderBottomWidth: BORDERS.width.thin,
  },
  th: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    gap: SPACING.sm,
  },
  sectionIconPlate: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nombre: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: TYPOGRAPHY.fontWeight.regular as '400',
    paddingRight: SPACING.sm,
  },
  ref: {
    width: 92,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    textAlign: 'right',
  },
  credPill: {
    width: 40,
    borderRadius: BORDERS.radius.pill,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  credPillTxt: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: TYPOGRAPHY.fontWeight.medium as '500',
  },
  centerPad: { paddingVertical: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', fontSize: TYPOGRAPHY.fontSize.sm },
  errorText: {
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    lineHeight: 20,
  },
});

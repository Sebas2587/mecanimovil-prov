/**
 * Modal: servicios del sistema y créditos por postulación (API).
 * Sin BlurView: evita altura 0 y capas invisibles en algunos dispositivos.
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
import { MaterialIcons } from '@expo/vector-icons';
import { SPACING, TYPOGRAPHY, COLORS } from '@/app/design-system/tokens';
import creditosService, { type ServicioCreditoTablaRow } from '@/services/creditosService';

type Section = { title: string; data: ServicioCreditoTablaRow[] };

const INK = '#00171F';
const MUTED = '#5D6F75';
const CARD_BG = '#FFFFFF';

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
  primaryColor: string;
  textPrimary: string;
  textSecondary: string;
  borderGlass: string;
}

export const TablaServiciosCreditosModal: React.FC<TablaServiciosCreditosModalProps> = ({
  visible,
  onClose,
  primaryColor,
  borderGlass,
}) => {
  const { height: winH } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filas, setFilas] = useState<ServicioCreditoTablaRow[]>([]);

  const accent = primaryColor && primaryColor.length > 2 ? primaryColor : COLORS.primary?.[500] ?? '#003459';
  const sections = useMemo(() => buildSections(filas), [filas]);

  const screenH = winH > 120 ? winH : Dimensions.get('window').height;
  const maxH = Math.max(340, Math.min(screenH * 0.88, 620));
  const listMaxH = Math.max(220, maxH - 180);

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
      <View key={item.servicio_id} style={[styles.row, { borderBottomColor: borderGlass }]}>
        <Text style={styles.nombre} numberOfLines={2}>
          {item.nombre}
        </Text>
        <Text style={styles.ref}>{formatRef(item.precio_referencia_clp)}</Text>
        <View style={[styles.badge, { backgroundColor: accent + '22' }]}>
          <Text style={[styles.badgeTxt, { color: accent }]}>{item.creditos_requeridos}</Text>
        </View>
      </View>
    ),
    [accent, borderGlass]
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissHit} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheetWrap, { maxHeight: maxH }]}>
          <View
            style={[
              styles.card,
              {
                borderColor: borderGlass,
                maxHeight: maxH,
                minHeight: 280,
              },
            ]}
          >
            <View style={styles.inner}>
              <View style={styles.header}>
                <Text style={styles.title}>Servicios y créditos</Text>
                <Pressable onPress={onClose} hitSlop={14} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={26} color={MUTED} />
                </Pressable>
              </View>
              <Text style={styles.sub}>
                Precio referencia es orientativo en el sistema. Al postular se descuentan los créditos indicados.
              </Text>
              <View style={[styles.tableHead, { borderBottomColor: borderGlass }]}>
                <Text style={[styles.th, { flex: 1 }]}>Servicio</Text>
                <Text style={[styles.th, { width: 88 }]}>Ref.</Text>
                <Text style={[styles.th, { width: 36, textAlign: 'right' }]}>Cr.</Text>
              </View>
              {loading ? (
                <View style={[styles.centerPad, { minHeight: listMaxH * 0.4 }]}>
                  <ActivityIndicator size="large" color={accent} />
                </View>
              ) : error ? (
                <View style={[styles.centerPad, { minHeight: listMaxH * 0.4 }]}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : filas.length === 0 ? (
                <View style={[styles.centerPad, { minHeight: listMaxH * 0.4 }]}>
                  <Text style={styles.empty}>No hay servicios cargados.</Text>
                </View>
              ) : (
                <ScrollView
                  style={{ maxHeight: listMaxH }}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                >
                  {sections.map((section) => (
                    <View key={section.title}>
                      <View style={styles.sectionHead}>
                        <MaterialIcons name="layers" size={16} color={accent} style={styles.sectionHeadIcon} />
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <Text style={styles.sectionCount}>({section.data.length})</Text>
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
    backgroundColor: 'rgba(0, 23, 31, 0.5)',
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
    elevation: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  inner: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    width: '100%',
  },
  scrollContent: { paddingBottom: SPACING.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '800', color: INK, flex: 1, paddingRight: 8 },
  sub: { fontSize: TYPOGRAPHY.fontSize.xs, lineHeight: 18, color: MUTED, marginBottom: SPACING.sm },
  closeBtn: { padding: 4 },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1 },
  th: { fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 6,
    backgroundColor: 'rgba(0, 52, 89, 0.06)',
    borderRadius: 10,
  },
  sectionHeadIcon: { marginRight: 8 },
  sectionTitle: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '800', color: INK, flex: 1 },
  sectionCount: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: '600', color: MUTED },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nombre: { flex: 1, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '500', color: INK, paddingRight: 8 },
  ref: { width: 88, fontSize: TYPOGRAPHY.fontSize.xs, textAlign: 'right', color: MUTED },
  badge: { width: 36, borderRadius: 10, paddingVertical: 4, alignItems: 'center' },
  badgeTxt: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '800' },
  centerPad: { paddingVertical: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', fontSize: TYPOGRAPHY.fontSize.sm, color: MUTED },
  errorText: {
    textAlign: 'center',
    color: COLORS.error?.main ?? '#E64A4A',
    paddingHorizontal: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});

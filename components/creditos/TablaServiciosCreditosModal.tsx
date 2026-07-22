/**
 * Modal Host: servicios del sistema y créditos por postulación (API).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { InstitutionalModal } from '@/app/design-system/components/InstitutionalModal';
import { InstitutionalTag, InstitutionalButton } from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { SPACING, TYPOGRAPHY, COLORS, BORDERS } from '@/app/design-system/tokens';
import creditosService, { type ServicioCreditoTablaRow } from '@/services/creditosService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

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

export const TablaServiciosCreditosModal: React.FC<TablaServiciosCreditosModalProps> = ({
  visible,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filas, setFilas] = useState<ServicioCreditoTablaRow[]>([]);

  const sections = useMemo(() => buildSections(filas), [filas]);

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
      void cargar();
    }
  }, [visible, cargar]);

  const renderRow = useCallback((item: ServicioCreditoTablaRow, isLast: boolean) => (
    <View key={item.servicio_id} style={[styles.row, !isLast && styles.rowBorder]}>
      <Text style={styles.nombre} numberOfLines={2}>
        {item.nombre}
      </Text>
      <Text style={styles.ref}>{formatRef(item.precio_referencia_clp)}</Text>
      <Text style={styles.cred}>{item.creditos_requeridos}</Text>
    </View>
  ), []);

  return (
    <InstitutionalModal
      visible={visible}
      onRequestClose={onClose}
      onClose={onClose}
      title="Servicios y créditos"
      animationType="slide"
      footer={
        <InstitutionalButton
          label="Cerrar"
          variant="outline"
          size="compact"
          onPress={onClose}
          style={styles.footerBtn}
        />
      }
    >
      <View style={styles.introRow}>
        <InstitutionalTag label="Referencia" variant="neutral" size="sm" />
      </View>
      <Text style={styles.sub}>
        El precio de referencia es orientativo. Al postular se descuentan los créditos indicados.
      </Text>

      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.thServicio]}>Servicio</Text>
        <Text style={[styles.th, styles.thRef]}>Ref. CLP</Text>
        <Text style={[styles.th, styles.thCred]}>Cr.</Text>
      </View>

      {loading ? (
        <View style={styles.centerPad}>
          <ActivityIndicator size="large" color={I.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerPad}>
          <Text style={styles.errorText}>{error}</Text>
          <InstitutionalButton
            label="Reintentar"
            variant="tertiary"
            size="compact"
            onPress={() => {
              void cargar();
            }}
          />
        </View>
      ) : filas.length === 0 ? (
        <View style={styles.centerPad}>
          <Text style={styles.empty}>No hay servicios cargados.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <View style={styles.sectionHead}>
                <View style={styles.sectionIcon}>
                  <InstitutionalIcon
                    name="layers"
                    size={16}
                    color={I.ink}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                </View>
                <Text style={styles.sectionTitle} numberOfLines={2}>
                  {section.title}
                </Text>
                <Text style={styles.sectionCount}>{section.data.length}</Text>
              </View>
              {section.data.map((item, idx) =>
                renderRow(item, idx === section.data.length - 1)
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </InstitutionalModal>
  );
};

const styles = StyleSheet.create({
  introRow: {
    marginBottom: SPACING.fixed.sm,
  },
  sub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: 20,
    color: I.body,
    marginBottom: SPACING.fixed.md,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.fixed.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
    marginBottom: SPACING.fixed.xs,
  },
  th: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase',
    color: I.muted,
  },
  thServicio: { flex: 1 },
  thRef: { width: 88, textAlign: 'right' },
  thCred: { width: 36, textAlign: 'right' },
  list: {
    maxHeight: 420,
  },
  scrollContent: {
    paddingBottom: SPACING.fixed.md,
  },
  section: {
    marginTop: SPACING.fixed.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
  },
  sectionIcon: {
    ...hostIconPlateStyle,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  sectionTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
  },
  sectionCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.monoMedium,
    color: I.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.fixed.sm,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  nombre: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.ink,
    paddingRight: SPACING.fixed.sm,
  },
  ref: {
    width: 88,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    textAlign: 'right',
    color: I.body,
  },
  cred: {
    width: 36,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    textAlign: 'right',
    color: I.ink,
  },
  centerPad: {
    paddingVertical: SPACING.fixed.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
  },
  empty: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  errorText: {
    textAlign: 'center',
    paddingHorizontal: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: 20,
    color: I.semanticDown,
  },
  footerBtn: {
    alignSelf: 'stretch',
    width: '100%',
  },
});

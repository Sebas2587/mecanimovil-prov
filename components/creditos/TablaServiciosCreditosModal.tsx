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
  useWindowDimensions,
} from 'react-native';
import { InstitutionalModal } from '@/app/design-system/components/InstitutionalModal';
import { InstitutionalButton } from '@/app/design-system/components';
import { SPACING, TYPOGRAPHY, COLORS } from '@/app/design-system/tokens';
import creditosService, { type ServicioCreditoTablaRow } from '@/services/creditosService';

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
  const { height: windowHeight } = useWindowDimensions();
  const listMaxHeight = Math.max(220, Math.round(windowHeight * 0.92) - 280);
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

  const renderRow = useCallback((item: ServicioCreditoTablaRow) => (
    <View key={item.servicio_id} style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={styles.nombre} numberOfLines={2}>
          {item.nombre}
        </Text>
        <Text style={styles.ref}>{formatRef(item.precio_referencia_clp)}</Text>
      </View>
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
    >
      <Text style={styles.sub}>
        Precio orientativo. Al postular se descuentan los créditos de la derecha.
      </Text>

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
          style={[styles.list, { height: listMaxHeight }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.data.map((item) => renderRow(item))}
            </View>
          ))}
        </ScrollView>
      )}
    </InstitutionalModal>
  );
};

const styles = StyleSheet.create({
  sub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: 20,
    color: I.muted,
    marginBottom: SPACING.fixed.md,
  },
  list: {
    alignSelf: 'stretch',
    width: '100%',
  },
  scrollContent: {
    paddingBottom: SPACING.fixed.sm,
  },
  section: {
    marginTop: SPACING.fixed.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: I.muted,
    marginBottom: SPACING.fixed.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nombre: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansRegular,
    color: I.ink,
  },
  ref: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  cred: {
    minWidth: 28,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
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
});

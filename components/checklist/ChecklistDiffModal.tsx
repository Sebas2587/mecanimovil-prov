import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  checklistService,
  ChecklistPreviewImpacto,
  ChecklistPreviewDiffItem,
  ChecklistNivelAlerta,
  ChecklistTipoActualizacion,
} from '@/services/checklistService';

const I = COLORS.institutional;

interface ChecklistDiffModalProps {
  visible: boolean;
  instanceId: number | null;
  onCancel: () => void;
  onConfirm: () => void;
  finalizing?: boolean;
}

const NIVEL_COLOR: Record<ChecklistNivelAlerta, string> = {
  OPTIMO: COLORS.success.main,
  ATENCION: COLORS.warning.main,
  URGENTE: COLORS.warning.dark,
  CRITICO: COLORS.error.main,
};

const NIVEL_LABEL: Record<ChecklistNivelAlerta, string> = {
  OPTIMO: 'Óptimo',
  ATENCION: 'Atención',
  URGENTE: 'Urgente',
  CRITICO: 'Crítico',
};

const TIPO_LABEL: Record<ChecklistTipoActualizacion, string> = {
  REEMPLAZA: 'Reemplazo',
  INSPECCIONA: 'Inspección',
  INFORMATIVO: 'Informativo',
};

// Resolver color por porcentaje cuando no hay nivel calculado.
function colorPorPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return COLORS.neutral.gray[400];
  if (pct >= 80) return COLORS.success.main;
  if (pct >= 60) return COLORS.warning.main;
  if (pct >= 35) return COLORS.warning.dark;
  return COLORS.error.main;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_MAX_WIDTH = SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2;

export const ChecklistDiffModal: React.FC<ChecklistDiffModalProps> = ({
  visible,
  instanceId,
  onCancel,
  onConfirm,
  finalizing = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ChecklistPreviewImpacto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !instanceId) {
      setPreview(null);
      setError(null);
      return;
    }

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await checklistService.getPreviewImpacto(instanceId);
        if (!res.success || res.data == null) {
          setError(res.message || 'No se pudo calcular el impacto.');
          setPreview(null);
          return;
        }
        setPreview(res.data);
      } catch (e: any) {
        const msg = e?.response?.data?.detail || e?.message || 'No se pudo calcular el impacto.';
        console.warn('Error preview-impacto:', e);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [visible, instanceId]);

  const renderDiffItem = (item: ChecklistPreviewDiffItem, idx: number) => {
    const actualPct = item.salud_actual ?? 0;
    const nuevaPct = item.salud_nueva ?? 0;
    const colorActual = item.nivel_alerta_actual
      ? NIVEL_COLOR[item.nivel_alerta_actual]
      : colorPorPct(item.salud_actual);
    const colorNuevo = item.nivel_alerta_nuevo
      ? NIVEL_COLOR[item.nivel_alerta_nuevo]
      : colorPorPct(item.salud_nueva);
    const deltaPositivo = item.delta >= 0;

    return (
      <View key={`${item.componente.id}-${idx}`} style={styles.diffCard}>
        <View style={styles.diffHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.diffComponentName}>{item.componente.nombre}</Text>
            <View style={styles.diffTipoBadge}>
              <Text style={styles.diffTipoBadgeText}>
                {TIPO_LABEL[item.tipo_actualizacion]}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.diffDeltaBadge,
              {
                backgroundColor: deltaPositivo
                  ? COLORS.success.light
                  : COLORS.error.light,
              },
            ]}
          >
            <InstitutionalIcon
              name={deltaPositivo ? 'arrow-upward' : 'arrow-downward'}
              size={14}
              color={deltaPositivo ? COLORS.success.dark : COLORS.error.dark}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            <Text
              style={[
                styles.diffDeltaText,
                {
                  color: deltaPositivo ? COLORS.success.dark : COLORS.error.dark,
                },
              ]}
            >
              {deltaPositivo ? '+' : ''}
              {item.delta.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Barra "antes" */}
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Antes</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(0, Math.min(100, actualPct))}%`,
                  backgroundColor: COLORS.neutral.gray[400],
                },
              ]}
            />
          </View>
          <Text style={[styles.barValue, { color: colorActual }]}>
            {item.salud_actual !== null && item.salud_actual !== undefined
              ? `${actualPct.toFixed(0)}%`
              : 'N/D'}
          </Text>
        </View>

        {/* Barra "después" */}
        <View style={styles.barRow}>
          <Text style={[styles.barLabel, { fontWeight: TYPOGRAPHY.fontWeight.bold }]}>
            Después
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(0, Math.min(100, nuevaPct))}%`,
                  backgroundColor: colorNuevo,
                },
              ]}
            />
          </View>
          <Text style={[styles.barValue, { color: colorNuevo, fontWeight: TYPOGRAPHY.fontWeight.bold }]}>
            {nuevaPct.toFixed(0)}%
          </Text>
        </View>

        {item.nivel_alerta_nuevo && (
          <View style={styles.nivelRow}>
            <View style={[styles.nivelDot, { backgroundColor: colorNuevo }]} />
            <Text style={styles.nivelText}>
              Nivel resultante: {NIVEL_LABEL[item.nivel_alerta_nuevo]}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderResumenGeneral = () => {
    if (!preview) return null;
    const actual = preview.salud_general_actual;
    const nueva = preview.salud_general_estimada;
    const delta =
      actual !== null && actual !== undefined && nueva !== null && nueva !== undefined
        ? nueva - actual
        : null;
    const positivo = delta !== null && delta >= 0;

    return (
      <View style={styles.resumenCard}>
        <Text style={styles.resumenTitle}>Salud general del vehículo</Text>
        <View style={styles.resumenRow}>
          <View style={styles.resumenCol}>
            <Text style={styles.resumenLabel}>Actual</Text>
            <Text style={[styles.resumenValue, { color: colorPorPct(actual) }]}>
              {actual !== null && actual !== undefined ? `${actual.toFixed(0)}%` : 'N/D'}
            </Text>
          </View>
          <InstitutionalIcon
            name="arrow-forward"
            size={20}
            color={COLORS.neutral.gray[500]}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          <View style={styles.resumenCol}>
            <Text style={styles.resumenLabel}>Estimada</Text>
            <Text style={[styles.resumenValue, { color: colorPorPct(nueva) }]}>
              {nueva !== null && nueva !== undefined ? `${nueva.toFixed(0)}%` : 'N/D'}
            </Text>
          </View>
          {delta !== null && (
            <View style={styles.resumenCol}>
              <Text style={styles.resumenLabel}>Variación</Text>
              <Text
                style={[
                  styles.resumenValue,
                  { color: positivo ? COLORS.success.main : COLORS.error.main },
                ]}
              >
                {positivo ? '+' : ''}
                {delta.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <InstitutionalIcon
              name="close"
              size={24}
              color={COLORS.text.primary}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Resumen del impacto</Text>
            <Text style={styles.headerSubtitle}>
              Revisa cómo cambiará la salud del vehículo
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary[500]} />
              <Text style={styles.loadingText}>Calculando impacto...</Text>
            </View>
          )}

          {!loading && error && (
            <View style={styles.errorContainer}>
              <InstitutionalIcon
                name="error"
                size={48}
                color={COLORS.error.main}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              <Text style={styles.errorTitle}>No se pudo calcular el impacto</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <Text style={styles.errorHint}>
                Puedes finalizar el checklist igualmente; las métricas se actualizarán al completar.
              </Text>
            </View>
          )}

          {!loading && !error && preview && (
            <>
              {renderResumenGeneral()}
              <InstitutionalSectionHeader
                title={`Componentes a actualizar (${preview.diff.length})`}
              />
              {preview.diff.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <InstitutionalIcon
                    name="info"
                    size={32}
                    color={COLORS.neutral.gray[500]}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                  <Text style={styles.emptyText}>
                    Este checklist no actualiza métricas de salud.
                  </Text>
                </View>
              ) : (
                preview.diff.map(renderDiffItem)
              )}
            </>
          )}
        </ScrollView>

        {/* Footer con botones */}
        <View style={styles.footer}>
          <InstitutionalButton
            label="Revisar respuestas"
            variant="secondary"
            size="compact"
            onPress={onCancel}
            disabled={finalizing}
            style={styles.footerButton}
          />
          <InstitutionalButton
            label="Confirmar y finalizar"
            variant="primary"
            size="compact"
            onPress={onConfirm}
            disabled={finalizing || loading}
            loading={finalizing}
            leading={
              !finalizing ? (
                <InstitutionalIcon
                  name="check"
                  size={18}
                  color={I.onPrimary}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              ) : undefined
            }
            style={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
  },
  closeButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs / 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    paddingVertical: SPACING['2xl'],
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: TYPOGRAPHY.fontSize.sm - 1,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  resumenCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  resumenTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  resumenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  resumenCol: {
    flex: 1,
    alignItems: 'center',
  },
  resumenLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs / 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resumenValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  diffCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm + SPACING.xs,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  diffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  diffComponentName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs / 2,
  },
  diffTipoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200] || COLORS.primary[500],
  },
  diffTipoBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[600] || COLORS.primary[500],
  },
  diffDeltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDERS.radius.lg,
    gap: SPACING.xs / 2,
  },
  diffDeltaText: {
    fontSize: TYPOGRAPHY.fontSize.sm - 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginVertical: SPACING.xs / 2,
  },
  barLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    width: 56,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.neutral.gray[200],
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    width: 48,
    textAlign: 'right',
  },
  nivelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  nivelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nivelText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
    gap: SPACING.sm,
    ...SHADOWS.lg,
  },
  footerButton: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ChecklistDiffModal;

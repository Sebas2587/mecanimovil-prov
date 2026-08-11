import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Trash2, X } from 'lucide-react-native';
import {
  BottomSheet,
  InstitutionalButton,
  InstitutionalTag,
  InstitutionalText,
} from '@/app/design-system/components';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { CotizacionIaEditor } from '@/components/chats/CotizacionIaEditor';
import type { CotizacionPlantilla } from '@/services/cotizacionCanalService';
import {
  plantillaToCotizacionPreview,
  tituloServicioPlantilla,
  vehiculoLineaPlantilla,
} from '@/utils/plantillaCotizacionPreview';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type PlantillaCotizacionDetalleModalProps = {
  visible: boolean;
  plantilla: CotizacionPlantilla | null;
  onClose: () => void;
  onPrimaryAction?: () => void;
  primaryLabel?: string;
  primaryLoading?: boolean;
  onEliminar?: (plantilla: CotizacionPlantilla) => void;
};

/**
 * Detalle de plantilla — BottomSheet Host + mismo cuerpo que cotización enviada (CotizacionIaEditor).
 */
export function PlantillaCotizacionDetalleModal({
  visible,
  plantilla,
  onClose,
  onPrimaryAction,
  primaryLabel = 'Usar plantilla',
  primaryLoading = false,
  onEliminar,
}: PlantillaCotizacionDetalleModalProps) {
  const preview = useMemo(
    () => (plantilla ? plantillaToCotizacionPreview(plantilla) : null),
    [plantilla],
  );

  if (!plantilla || !preview) return null;

  const servicio = tituloServicioPlantilla(plantilla);
  const vehiculo = vehiculoLineaPlantilla(plantilla);
  const snap = plantilla.snapshot ?? {};
  const modalidad = String(snap.modalidad || 'taller') === 'domicilio' ? 'Domicilio' : 'Taller';
  const duracion = Number(snap.duracion_minutos_estimada || 0) || null;
  const actualizado = new Date(plantilla.actualizado_en).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <BottomSheet visible={visible} onClose={onClose} stickyFooter style={styles.sheet}>
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <InstitutionalText role="h4" numberOfLines={2}>
              {servicio}
            </InstitutionalText>
            <InstitutionalText role="caption" color="muted" numberOfLines={2}>
              {vehiculo || 'Sin vehículo'}
              {preview.vehiculo_patente ? ` · ${preview.vehiculo_patente.toUpperCase()}` : ''}
            </InstitutionalText>
            <View style={styles.tagsRow}>
              <InstitutionalTag
                label={plantilla.aprendizaje_auto ? 'Del agente' : 'Manual'}
                variant={plantilla.aprendizaje_auto ? 'info' : 'neutral'}
                size="sm"
              />
              <InstitutionalTag label="Plantilla" variant="primary" size="sm" />
              <InstitutionalTag label={modalidad} variant="neutral" size="sm" />
              {duracion ? (
                <InstitutionalTag label={`${duracion} min`} variant="neutral" size="sm" />
              ) : null}
            </View>
            <InstitutionalText role="small" color="muted">
              Usada {plantilla.uso_count}{' '}
              {plantilla.uso_count === 1 ? 'vez' : 'veces'} · Actualizada {actualizado}
            </InstitutionalText>
          </View>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            hitSlop={8}
          >
            <X size={22} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <CotizacionIaEditor
            cotizacion={preview}
            readonly
            sinHeader
            hideSendActions
            onChange={() => undefined}
          />
        </ScrollView>

        <View style={styles.footer}>
          {onEliminar ? (
            <TouchableOpacity
              style={styles.footerGhost}
              onPress={() => onEliminar(plantilla)}
              accessibilityRole="button"
              accessibilityLabel="Eliminar plantilla"
            >
              <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.footerGhostLabel}>Eliminar</Text>
            </TouchableOpacity>
          ) : null}
          <InstitutionalButton
            label="Cerrar"
            variant="outline"
            size="compact"
            onPress={onClose}
            style={styles.footerMid}
          />
          {onPrimaryAction ? (
            <InstitutionalButton
              label={primaryLabel}
              variant="primary"
              size="compact"
              loading={primaryLoading}
              disabled={primaryLoading}
              onPress={onPrimaryAction}
              style={styles.footerPrimary}
            />
          ) : null}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '94%',
    paddingHorizontal: SPACING.fixed.md,
  },
  root: {
    flex: 1,
    minHeight: 0,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.fixed.xxs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
    marginTop: SPACING.fixed.xxs,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    gap: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
    paddingBottom: 0,
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  footerGhost: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 56,
  },
  footerGhostLabel: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.semanticDown,
  },
  footerMid: { flex: 1 },
  footerPrimary: { flex: 1.35 },
});

export default PlantillaCotizacionDetalleModal;

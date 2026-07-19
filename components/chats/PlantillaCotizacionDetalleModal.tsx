import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Car, FileText, AlertTriangle } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { formatearMontoCLP, redondearCLP } from '@/utils/formatearMontoCLP';
import { resumenVehiculoPlantilla } from '@/utils/plantillasCotizacionVehiculo';
import type { CotizacionPlantilla } from '@/services/cotizacionCanalService';
import { withWebLineHeight } from '@/utils/webTypography';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TITLE = withWebLineHeight(TYPOGRAPHY.styles.h3);
const CAPTION = withWebLineHeight(TYPOGRAPHY.styles.caption);

type RepuestoSnap = {
  nombre?: string;
  cantidad?: number;
  precio_unitario_clp?: number;
};

function snapStr(snap: Record<string, unknown>, key: string): string {
  const v = snap[key];
  if (v == null) return '';
  return String(v).trim();
}

function snapNum(snap: Record<string, unknown>, key: string): number {
  const n = Number(snap[key] ?? 0);
  return Number.isFinite(n) ? redondearCLP(n) : 0;
}

export type PlantillaCotizacionDetalleModalProps = {
  visible: boolean;
  plantilla: CotizacionPlantilla | null;
  onClose: () => void;
  /** CTA opcional (p. ej. aplicar en agenda/chat). Si no hay, solo Cerrar. */
  onPrimaryAction?: () => void;
  primaryLabel?: string;
  primaryLoading?: boolean;
};

/**
 * Detalle de plantilla de cotización — modal pantalla completa (Airbnb Hosts).
 */
export function PlantillaCotizacionDetalleModal({
  visible,
  plantilla,
  onClose,
  onPrimaryAction,
  primaryLabel = 'Usar plantilla',
  primaryLoading = false,
}: PlantillaCotizacionDetalleModalProps) {
  const insets = useSafeAreaInsets();

  const detalle = useMemo(() => {
    if (!plantilla) return null;
    const snap = plantilla.snapshot ?? {};
    const repuestosRaw = Array.isArray(snap.repuestos) ? (snap.repuestos as RepuestoSnap[]) : [];
    const repuestos = repuestosRaw.map((r) => {
      const cantidad = redondearCLP(r.cantidad || 1);
      const unit = redondearCLP(r.precio_unitario_clp || 0);
      return {
        nombre: String(r.nombre || 'Repuesto').trim() || 'Repuesto',
        cantidad,
        unit,
        subtotal: cantidad * unit,
      };
    });
    const advertencias = Array.isArray(snap.advertencias)
      ? (snap.advertencias as unknown[]).map((a) => String(a)).filter(Boolean)
      : [];
    const modalidad = snapStr(snap, 'modalidad');
    const vehiculo =
      resumenVehiculoPlantilla(snap)
      || [plantilla.vehiculo_marca, plantilla.vehiculo_modelo, plantilla.vehiculo_cilindraje]
        .filter(Boolean)
        .join(' · ');

    return {
      titulo: plantilla.titulo,
      servicio: snapStr(snap, 'servicio_nombre') || plantilla.titulo,
      descripcion: snapStr(snap, 'descripcion_problema'),
      modalidadLabel: modalidad === 'domicilio' ? 'A domicilio' : 'En taller',
      vehiculo,
      patente: snapStr(snap, 'vehiculo_patente'),
      anio: snapStr(snap, 'vehiculo_anio'),
      motor: snapStr(snap, 'tipo_motor_label') || snapStr(snap, 'tipo_motor'),
      repuestos,
      manoObra: snapNum(snap, 'mano_obra_clp'),
      costoRepuestos: snapNum(snap, 'costo_repuestos_clp'),
      total: snapNum(snap, 'total_clp'),
      duracion: snapNum(snap, 'duracion_minutos_estimada') || null,
      advertencias,
      usoCount: plantilla.uso_count,
      actualizado: new Date(plantilla.actualizado_en).toLocaleDateString('es-CL'),
      creado: new Date(plantilla.creado_en).toLocaleDateString('es-CL'),
    };
  }, [plantilla]);

  if (!visible || !plantilla || !detalle) return null;

  const totalRepuestosCalc = detalle.repuestos.reduce((a, r) => a + r.subtotal, 0);
  const totalMostrar =
    detalle.total > 0
      ? detalle.total
      : totalRepuestosCalc + detalle.manoObra;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={2}>
              {detalle.titulo}
            </Text>
            <Text style={styles.subtitle}>
              Usada {detalle.usoCount} {detalle.usoCount === 1 ? 'vez' : 'veces'} · Actualizada{' '}
              {detalle.actualizado}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <X size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.tagsRow}>
            <InstitutionalTag label={detalle.modalidadLabel} variant="primary" size="sm" />
            {detalle.duracion ? (
              <InstitutionalTag
                label={`${detalle.duracion} min`}
                variant="neutral"
                size="sm"
              />
            ) : null}
          </View>

          <InstitutionalSectionHeader title="Servicio" />
          <View style={styles.card}>
            <View style={styles.rowIcon}>
              <FileText size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.cardTitle}>{detalle.servicio}</Text>
            </View>
            {detalle.descripcion ? (
              <Text style={styles.bodyText}>{detalle.descripcion}</Text>
            ) : (
              <Text style={styles.mutedText}>Sin descripción guardada</Text>
            )}
          </View>

          <InstitutionalSectionHeader title="Vehículo" />
          <View style={styles.card}>
            <View style={styles.rowIcon}>
              <Car size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.cardTitle}>
                {detalle.vehiculo || 'Sin vehículo asociado'}
              </Text>
            </View>
            {detalle.anio ? (
              <Text style={styles.metaLine}>Año: {detalle.anio}</Text>
            ) : null}
            {detalle.patente ? (
              <Text style={styles.metaLine}>Patente: {detalle.patente}</Text>
            ) : null}
            {detalle.motor ? (
              <Text style={styles.metaLine}>Motor: {detalle.motor}</Text>
            ) : null}
          </View>

          <InstitutionalSectionHeader title="Repuestos" />
          <View style={styles.card}>
            {detalle.repuestos.length === 0 ? (
              <Text style={styles.mutedText}>Sin repuestos en esta plantilla</Text>
            ) : (
              detalle.repuestos.map((rep, idx) => (
                <View key={`${rep.nombre}-${idx}`} style={styles.repuestoRow}>
                  <View style={styles.repuestoTextCol}>
                    <Text style={styles.repuestoNombre} numberOfLines={2}>
                      {rep.nombre}
                    </Text>
                    <Text style={styles.mutedText}>
                      x{rep.cantidad} · {formatearMontoCLP(rep.unit)} c/u
                    </Text>
                  </View>
                  <Text style={styles.repuestoSub}>{formatearMontoCLP(rep.subtotal)}</Text>
                </View>
              ))
            )}
          </View>

          <InstitutionalSectionHeader title="Totales" />
          <View style={styles.card}>
            <View style={styles.totalRow}>
              <Text style={styles.metaLine}>Repuestos</Text>
              <Text style={styles.metaValue}>
                {formatearMontoCLP(detalle.costoRepuestos || totalRepuestosCalc)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.metaLine}>Mano de obra</Text>
              <Text style={styles.metaValue}>{formatearMontoCLP(detalle.manoObra)}</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatearMontoCLP(totalMostrar)}</Text>
            </View>
          </View>

          {detalle.advertencias.length > 0 ? (
            <>
              <InstitutionalSectionHeader title="Condiciones" />
              <View style={styles.card}>
                {detalle.advertencias.map((adv, idx) => (
                  <View key={`adv-${idx}`} style={styles.warnRow}>
                    <AlertTriangle size={14} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.warnText}>{adv}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.footerMeta}>Creada el {detalle.creado}</Text>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
          <InstitutionalButton
            label="Cerrar"
            variant="outline"
            size="default"
            onPress={onClose}
            style={onPrimaryAction ? styles.footerBtnSecondary : styles.footerBtnFull}
          />
          {onPrimaryAction ? (
            <InstitutionalButton
              label={primaryLabel}
              variant="primary"
              size="default"
              onPress={onPrimaryAction}
              loading={primaryLoading}
              disabled={primaryLoading}
              style={styles.footerBtnPrimary}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as unknown as number } : null),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    gap: SPACING.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
  },
  title: {
    ...TITLE,
    color: I.ink,
    fontFamily: FF.sansSemiBold,
  },
  subtitle: {
    ...CAPTION,
    color: I.muted,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  rowIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardTitle: {
    flex: 1,
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: I.ink,
  },
  bodyText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * 1.45),
  },
  mutedText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
  },
  metaLine: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
  },
  metaValue: {
    fontFamily: FF.monoMedium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  repuestoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  repuestoTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  repuestoNombre: {
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  repuestoSub: {
    fontFamily: FF.monoMedium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
    marginVertical: SPACING.xs,
  },
  totalLabel: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: I.ink,
  },
  totalValue: {
    fontFamily: FF.monoMedium,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: I.ink,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  warnText: {
    flex: 1,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: 20,
  },
  footerMeta: {
    ...CAPTION,
    color: I.mutedSoft,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    backgroundColor: COLORS.background.paper,
  },
  footerBtnSecondary: { flex: 1, minWidth: 0 },
  footerBtnPrimary: { flex: 2, minWidth: 0 },
  footerBtnFull: { flex: 1 },
});

export default PlantillaCotizacionDetalleModal;

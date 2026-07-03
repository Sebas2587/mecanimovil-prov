import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Car, FileText } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { formatearMontoCLP, redondearCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;

const ESTADO_LABEL: Record<string, string> = {
  enviada: 'Enviada — esperando respuesta',
  aceptada: 'Aceptada por el cliente',
  rechazada: 'Rechazada',
  borrador: 'Borrador',
};

export interface RepuestoCotizacionBubble {
  nombre: string;
  cantidad: number;
  precio_unitario_clp: number;
}

export interface CotizacionCanalBubbleProps {
  servicioNombre: string;
  totalClp: number;
  manoObraClp?: number;
  costoRepuestosClp?: number;
  estado: string;
  esPropio: boolean;
  vehiculoMarca?: string;
  vehiculoModelo?: string;
  vehiculoAnio?: number | string | null;
  vehiculoCilindraje?: string;
  vehiculoPatente?: string;
  tipoMotorLabel?: string;
  modalidad?: string;
  descripcionProblema?: string;
  duracionMinutos?: number | null;
  repuestos?: RepuestoCotizacionBubble[];
  advertencias?: string[];
  /** Mensajes antiguos sin metadata completa */
  fallbackDetalle?: string;
}

function etiquetaVehiculo(props: CotizacionCanalBubbleProps): string {
  const partes = [
    props.vehiculoMarca?.trim(),
    props.vehiculoModelo?.trim(),
    props.vehiculoAnio ? String(props.vehiculoAnio) : '',
    props.vehiculoCilindraje?.trim() ? `${props.vehiculoCilindraje.trim()} cc` : '',
  ].filter(Boolean);
  return partes.join(' · ');
}

function modalidadLabel(modalidad?: string): string {
  return modalidad === 'domicilio' ? 'Servicio a domicilio' : 'Servicio en taller';
}

export function CotizacionCanalBubble({
  servicioNombre,
  totalClp,
  manoObraClp = 0,
  costoRepuestosClp = 0,
  estado,
  esPropio,
  vehiculoMarca,
  vehiculoModelo,
  vehiculoAnio,
  vehiculoCilindraje,
  vehiculoPatente,
  tipoMotorLabel,
  modalidad,
  descripcionProblema,
  duracionMinutos,
  repuestos = [],
  advertencias = [],
  fallbackDetalle,
}: CotizacionCanalBubbleProps) {
  const textPrimary = esPropio ? styles.textOnPrimary : undefined;
  const textMuted = esPropio ? styles.textOnPrimaryMuted : styles.textMuted;
  const textBody = esPropio ? styles.textOnPrimary : styles.textBody;
  const dividerColor = esPropio ? styles.dividerOnPrimary : styles.dividerDefault;
  const vehiculoEtiqueta = etiquetaVehiculo({
    servicioNombre,
    totalClp,
    estado,
    esPropio,
    vehiculoMarca,
    vehiculoModelo,
    vehiculoAnio,
    vehiculoCilindraje,
  });
  const tieneDetalleEstructurado =
    Boolean(vehiculoEtiqueta) || repuestos.length > 0 || manoObraClp > 0 || advertencias.length > 0;

  return (
    <View style={[styles.bubble, esPropio ? styles.bubbleOwn : styles.bubbleOther]}>
      <View style={styles.header}>
        <FileText size={16} color={esPropio ? I.onPrimary : I.primary} strokeWidth={2} />
        <Text style={[styles.title, textPrimary]}>Cotización</Text>
      </View>

      <Text style={[styles.servicio, textPrimary]} numberOfLines={3}>
        {servicioNombre}
      </Text>
      <Text style={[styles.modalidad, textMuted]}>{modalidadLabel(modalidad)}</Text>

      {tieneDetalleEstructurado ? (
        <>
          {vehiculoEtiqueta ? (
            <View style={styles.vehiculoBox}>
              <Car size={14} color={esPropio ? I.onPrimary : I.primary} strokeWidth={2} />
              <View style={styles.vehiculoTextCol}>
                <Text style={[styles.vehiculoTitle, textPrimary]}>Vehículo</Text>
                <Text style={[styles.vehiculoValue, textBody]}>{vehiculoEtiqueta}</Text>
                {vehiculoPatente?.trim() ? (
                  <Text style={[styles.vehiculoExtra, textMuted]}>Patente: {vehiculoPatente.trim()}</Text>
                ) : null}
                {tipoMotorLabel?.trim() ? (
                  <Text style={[styles.vehiculoExtra, textMuted]}>Motor: {tipoMotorLabel.trim()}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {descripcionProblema?.trim() ? (
            <Text style={[styles.detalle, textBody]} numberOfLines={4}>
              {descripcionProblema.trim()}
            </Text>
          ) : null}

          {repuestos.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, textPrimary]}>Repuestos</Text>
              {repuestos.map((rep, idx) => {
                const cant = redondearCLP(rep.cantidad || 1);
                const unit = redondearCLP(rep.precio_unitario_clp);
                const sub = cant * unit;
                return (
                  <Text key={`rep-${idx}-${rep.nombre}`} style={[styles.lineItem, textBody]} numberOfLines={2}>
                    • {rep.nombre} x{cant} — {formatearMontoCLP(sub)}
                  </Text>
                );
              })}
              {costoRepuestosClp > 0 ? (
                <Text style={[styles.subtotalLine, textMuted]}>
                  Subtotal repuestos: {formatearMontoCLP(costoRepuestosClp)}
                </Text>
              ) : null}
            </View>
          ) : null}

          {manoObraClp > 0 ? (
            <Text style={[styles.lineItem, textBody]}>
              Mano de obra: {formatearMontoCLP(manoObraClp)}
            </Text>
          ) : null}

          {duracionMinutos ? (
            <Text style={[styles.lineItem, textMuted]}>
              Duración estimada: {duracionMinutos} min
            </Text>
          ) : null}

          {advertencias.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, textPrimary]}>Condiciones</Text>
              {advertencias.map((adv, idx) => (
                <Text key={`adv-${idx}`} style={[styles.lineItem, textMuted]} numberOfLines={3}>
                  • {adv}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : fallbackDetalle?.trim() ? (
        <Text style={[styles.fallbackDetalle, textBody]}>{fallbackDetalle.trim()}</Text>
      ) : null}

      <View style={[styles.divider, dividerColor]} />

      <Text style={[styles.total, textPrimary]}>Total: {formatearMontoCLP(totalClp)}</Text>
      <Text style={[styles.estado, textMuted]}>{ESTADO_LABEL[estado] || estado}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '92%',
    minWidth: 260,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.sm + 4,
    gap: SPACING.xs,
  },
  bubbleOwn: {
    backgroundColor: I.primary,
    alignSelf: 'flex-end',
  },
  bubbleOther: {
    backgroundColor: I.surfaceSoft,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    alignSelf: 'flex-start',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  title: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.primary,
  },
  servicio: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  modalidad: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  vehiculoBox: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  vehiculoTextCol: { flex: 1, gap: 2 },
  vehiculoTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.ink,
  },
  vehiculoValue: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
    lineHeight: 18,
  },
  vehiculoExtra: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  detalle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
    lineHeight: 18,
  },
  section: { gap: 2, marginTop: SPACING.xs },
  sectionTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.ink,
    marginBottom: 2,
  },
  lineItem: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
    lineHeight: 18,
  },
  subtotalLine: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
    marginTop: 2,
  },
  fallbackDetalle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.xs,
  },
  dividerDefault: { backgroundColor: I.hairline },
  dividerOnPrimary: { backgroundColor: 'rgba(255,255,255,0.25)' },
  total: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  estado: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  textOnPrimary: { color: I.onPrimary },
  textOnPrimaryMuted: { color: 'rgba(255,255,255,0.85)' },
  textMuted: { color: I.muted },
  textBody: { color: I.body },
});

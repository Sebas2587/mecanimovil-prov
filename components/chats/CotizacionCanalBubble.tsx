import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { formatearMontoCLP, redondearCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

const ESTADO_LABEL: Record<string, string> = {
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  borrador: 'Borrador',
};

/** Líneas / ítems que fuerzan “Ver más” en colapsado. */
const DESC_COLLAPSE_LINES = 2;
const REPUESTOS_COLLAPSE = 2;
const MANO_OBRA_COLLAPSE = 2;

export interface RepuestoCotizacionBubble {
  nombre: string;
  cantidad: number;
  precio_unitario_clp: number;
}

export interface ManoObraLineaBubble {
  nombre: string;
  monto_clp: number;
}

export interface HorarioSugeridoSlot {
  fecha: string;
  hora: string;
  label: string;
}

export interface CotizacionCanalBubbleProps {
  cotizacion?: CotizacionCanal;
  esTaller?: boolean;
  onVerDetalle?: () => void;
  servicioNombre?: string;
  totalClp?: number;
  manoObraClp?: number;
  costoRepuestosClp?: number;
  estado?: string;
  esPropio?: boolean;
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
  manoObraLineas?: ManoObraLineaBubble[];
  advertencias?: string[];
  fallbackDetalle?: string;
  horariosSugeridos?: HorarioSugeridoSlot[];
  onSelectHorario?: (slot: HorarioSugeridoSlot) => void;
  onVerMasHorarios?: () => void;
}

function etiquetaVehiculo(props: CotizacionCanalBubbleProps): string {
  const vMarca = props.vehiculoMarca || props.cotizacion?.vehiculo_marca;
  const vModelo = props.vehiculoModelo || props.cotizacion?.vehiculo_modelo;
  const vAnio = props.vehiculoAnio || props.cotizacion?.vehiculo_anio;
  const partes = [
    vMarca?.trim(),
    vModelo?.trim(),
    vAnio ? String(vAnio) : '',
  ].filter(Boolean);
  return partes.join(' · ');
}

/** Tarjeta cotización en chat: colapsable con Ver más / Ver menos. */
export function CotizacionCanalBubble(props: CotizacionCanalBubbleProps) {
  const {
    cotizacion,
    esTaller,
    onVerDetalle,
    servicioNombre = cotizacion?.servicio_nombre || 'Cotización',
    totalClp = cotizacion?.total_clp || 0,
    manoObraClp = cotizacion?.mano_obra_clp || 0,
    costoRepuestosClp = cotizacion?.costo_repuestos_clp || 0,
    estado = cotizacion?.estado || 'borrador',
    esPropio = esTaller ?? true,
    vehiculoMarca = cotizacion?.vehiculo_marca,
    vehiculoModelo = cotizacion?.vehiculo_modelo,
    vehiculoAnio = cotizacion?.vehiculo_anio,
    vehiculoPatente = cotizacion?.vehiculo_patente,
    tipoMotorLabel = cotizacion?.tipo_motor_label,
    modalidad = cotizacion?.modalidad,
    descripcionProblema = cotizacion?.descripcion_problema,
    duracionMinutos = cotizacion?.duracion_minutos,
    repuestos = (cotizacion?.repuestos as RepuestoCotizacionBubble[]) || [],
    manoObraLineas = (cotizacion?.mano_obra_lineas as ManoObraLineaBubble[]) || [],
    advertencias = [],
    fallbackDetalle,
    horariosSugeridos = [],
    onSelectHorario,
  } = props;
  const [expanded, setExpanded] = useState(false);
  const t = esPropio ? own : soft;

  const vehiculoEtiqueta = etiquetaVehiculo({
    servicioNombre,
    totalClp,
    estado,
    esPropio,
    vehiculoMarca,
    vehiculoModelo,
    vehiculoAnio,
  });
  const modalidadTxt = modalidad === 'domicilio' ? 'A domicilio' : 'En taller';
  const metaParts = [
    vehiculoEtiqueta,
    vehiculoPatente?.trim() ? vehiculoPatente.trim().toUpperCase() : '',
    tipoMotorLabel?.trim() || '',
    modalidadTxt,
  ].filter(Boolean);

  const desc = descripcionProblema?.trim() || '';
  const fallback = fallbackDetalle?.trim() || '';
  const hasDetalleExtra = useMemo(() => {
    if (desc.length > 90 || desc.split(/\n/).length > DESC_COLLAPSE_LINES) return true;
    if (repuestos.length > REPUESTOS_COLLAPSE) return true;
    if (manoObraLineas.length > MANO_OBRA_COLLAPSE) return true;
    if (manoObraClp > 0 || manoObraLineas.length > 0 || duracionMinutos || advertencias.length > 0) return true;
    if (!vehiculoEtiqueta && !repuestos.length && fallback.length > 120) return true;
    return Boolean(costoRepuestosClp > 0 && repuestos.length > 0);
  }, [
    advertencias.length,
    costoRepuestosClp,
    desc,
    duracionMinutos,
    fallback.length,
    manoObraClp,
    manoObraLineas.length,
    repuestos.length,
    vehiculoEtiqueta,
  ]);

  const showExpand = hasDetalleExtra;
  const repuestosVisible = expanded ? repuestos : repuestos.slice(0, REPUESTOS_COLLAPSE);
  const moConMonto = manoObraLineas.filter((lin) => Number(lin.monto_clp) > 0 && String(lin.nombre || '').trim());
  const moVisible = expanded ? moConMonto : moConMonto.slice(0, MANO_OBRA_COLLAPSE);

  return (
    <View style={[styles.card, esPropio ? styles.cardOwn : styles.cardOther]}>
      <Text style={[styles.kicker, t.kicker]}>
        Cotización · {ESTADO_LABEL[estado] || estado}
      </Text>
      <Text style={[styles.title, t.title]} numberOfLines={expanded ? undefined : 2}>
        {servicioNombre}
      </Text>
      {metaParts.length ? (
        <Text style={[styles.meta, t.meta]} numberOfLines={expanded ? undefined : 1}>
          {metaParts.join(' · ')}
        </Text>
      ) : null}

      {desc ? (
        <Text
          style={[styles.body, t.body]}
          numberOfLines={expanded ? undefined : DESC_COLLAPSE_LINES}
        >
          {desc}
        </Text>
      ) : null}

      {(expanded || repuestos.length > 0) && repuestosVisible.length > 0 ? (
        <View style={styles.block}>
          {repuestosVisible.map((rep, idx) => {
            const cant = redondearCLP(rep.cantidad || 1);
            const unit = redondearCLP(rep.precio_unitario_clp);
            return (
              <Text key={`rep-${idx}`} style={[styles.line, t.line]} numberOfLines={expanded ? 2 : 1}>
                {rep.nombre} ×{cant} · {formatearMontoCLP(cant * unit)}
              </Text>
            );
          })}
          {!expanded && repuestos.length > REPUESTOS_COLLAPSE ? (
            <Text style={[styles.lineMuted, t.lineMuted]}>
              +{repuestos.length - REPUESTOS_COLLAPSE} repuestos más
            </Text>
          ) : null}
        </View>
      ) : null}

      {(expanded || moConMonto.length > 0) && moVisible.length > 0 ? (
        <View style={styles.block}>
          {moVisible.map((lin, idx) => (
            <Text key={`mo-${idx}`} style={[styles.line, t.line]} numberOfLines={expanded ? 2 : 1}>
              {lin.nombre} · {formatearMontoCLP(lin.monto_clp)}
            </Text>
          ))}
          {!expanded && moConMonto.length > MANO_OBRA_COLLAPSE ? (
            <Text style={[styles.lineMuted, t.lineMuted]}>
              +{moConMonto.length - MANO_OBRA_COLLAPSE} trabajos más
            </Text>
          ) : null}
        </View>
      ) : null}

      {expanded ? (
        <>
          {costoRepuestosClp > 0 ? (
            <Text style={[styles.lineMuted, t.lineMuted]}>
              Repuestos {formatearMontoCLP(costoRepuestosClp)}
            </Text>
          ) : null}
          {!moConMonto.length && manoObraClp > 0 ? (
            <Text style={[styles.line, t.line]}>
              Mano de obra {formatearMontoCLP(manoObraClp)}
            </Text>
          ) : null}
          {duracionMinutos ? (
            <Text style={[styles.lineMuted, t.lineMuted]}>
              {duracionMinutos} min estimados
            </Text>
          ) : null}
          {advertencias.map((adv, idx) => (
            <Text key={`adv-${idx}`} style={[styles.lineMuted, t.lineMuted]} numberOfLines={3}>
              {adv}
            </Text>
          ))}
          {!vehiculoEtiqueta && !repuestos.length && fallback ? (
            <Text style={[styles.body, t.body]}>{fallback}</Text>
          ) : null}
        </>
      ) : null}

      {!expanded && !desc && !vehiculoEtiqueta && !repuestos.length && fallback ? (
        <Text style={[styles.body, t.body]} numberOfLines={3}>
          {fallback}
        </Text>
      ) : null}

      {horariosSugeridos && horariosSugeridos.length > 0 ? (
        <View style={styles.horariosBlock}>
          <Text style={[styles.horariosTitle, t.kicker]}>
            Horarios sugeridos (Tap para agendar 1-clic):
          </Text>
          <View style={styles.horariosGrid}>
            {horariosSugeridos.map((slot, sIdx) => (
              <Pressable
                key={`slot-${sIdx}`}
                style={styles.horarioPill}
                onPress={() => onSelectHorario?.(slot)}
              >
                <Text style={styles.horarioPillText}>{slot.label}</Text>
              </Pressable>
            ))}
          </View>
          {onVerMasHorarios ? (
            <Pressable style={styles.verMasBtn} onPress={onVerMasHorarios}>
              <Text style={styles.verMasBtnText}>📅 Ver más fechas en la Agenda Global</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.footer, t.footer]}>
        <Text style={[styles.total, t.total]}>{formatearMontoCLP(totalClp)}</Text>
        {showExpand ? (
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Ver menos' : 'Ver más'}
          >
            <Text style={[styles.expandLink, t.expandLink]}>
              {expanded ? 'Ver menos' : 'Ver más'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const soft = StyleSheet.create({
  kicker: { color: I.muted },
  title: { color: I.ink },
  meta: { color: I.muted },
  body: { color: I.body },
  line: { color: I.ink },
  lineMuted: { color: I.muted },
  footer: { borderTopColor: I.hairline },
  total: { color: I.ink },
  expandLink: { color: I.primary },
});

const own = StyleSheet.create({
  kicker: { color: withOpacity(I.onPrimary, 0.65) },
  title: { color: I.onPrimary },
  meta: { color: withOpacity(I.onPrimary, 0.7) },
  body: { color: withOpacity(I.onPrimary, 0.88) },
  line: { color: withOpacity(I.onPrimary, 0.92) },
  lineMuted: { color: withOpacity(I.onPrimary, 0.6) },
  footer: { borderTopColor: withOpacity(I.onPrimary, 0.2) },
  total: { color: I.onPrimary },
  expandLink: { color: withOpacity(I.onPrimary, 0.9) },
});

const styles = StyleSheet.create({
  card: {
    maxWidth: 280,
    borderRadius: BORDERS.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  cardOwn: {
    backgroundColor: I.ink,
    alignSelf: 'flex-end',
  },
  cardOther: {
    backgroundColor: I.surfaceStrong,
    alignSelf: 'flex-start',
  },
  kicker: {
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.base,
    lineHeight: 22,
  },
  meta: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 18,
  },
  body: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 18,
    marginTop: 2,
  },
  block: { gap: 2, marginTop: 4 },
  line: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  lineMuted: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  total: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.base,
    flexShrink: 1,
  },
  expandLink: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    textDecorationLine: 'underline',
  },
  horariosBlock: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    gap: 6,
  },
  horariosTitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
  },
  horariosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  horarioPill: {
    backgroundColor: I.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.lg,
  },
  horarioPillText: {
    color: I.onPrimary,
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  verMasBtn: {
    marginTop: 4,
    paddingVertical: 4,
  },
  verMasBtnText: {
    color: I.primary,
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
});

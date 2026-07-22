import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/app/design-system/tokens';
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
  fallbackDetalle?: string;
}

function etiquetaVehiculo(props: CotizacionCanalBubbleProps): string {
  const partes = [
    props.vehiculoMarca?.trim(),
    props.vehiculoModelo?.trim(),
    props.vehiculoAnio ? String(props.vehiculoAnio) : '',
  ].filter(Boolean);
  return partes.join(' · ');
}

/** Tarjeta cotización en chat: colapsable con Ver más / Ver menos. */
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
  vehiculoPatente,
  tipoMotorLabel,
  modalidad,
  descripcionProblema,
  duracionMinutos,
  repuestos = [],
  advertencias = [],
  fallbackDetalle,
}: CotizacionCanalBubbleProps) {
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
    if (manoObraClp > 0 || duracionMinutos || advertencias.length > 0) return true;
    if (!vehiculoEtiqueta && !repuestos.length && fallback.length > 120) return true;
    return Boolean(costoRepuestosClp > 0 && repuestos.length > 0);
  }, [
    advertencias.length,
    costoRepuestosClp,
    desc,
    duracionMinutos,
    fallback.length,
    manoObraClp,
    repuestos.length,
    vehiculoEtiqueta,
  ]);

  const showExpand = hasDetalleExtra;
  const repuestosVisible = expanded ? repuestos : repuestos.slice(0, REPUESTOS_COLLAPSE);

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

      {expanded ? (
        <>
          {costoRepuestosClp > 0 ? (
            <Text style={[styles.lineMuted, t.lineMuted]}>
              Repuestos {formatearMontoCLP(costoRepuestosClp)}
            </Text>
          ) : null}
          {manoObraClp > 0 ? (
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
  kicker: { color: 'rgba(255,255,255,0.65)' },
  title: { color: '#FFFFFF' },
  meta: { color: 'rgba(255,255,255,0.7)' },
  body: { color: 'rgba(255,255,255,0.88)' },
  line: { color: 'rgba(255,255,255,0.92)' },
  lineMuted: { color: 'rgba(255,255,255,0.6)' },
  footer: { borderTopColor: 'rgba(255,255,255,0.2)' },
  total: { color: '#FFFFFF' },
  expandLink: { color: 'rgba(255,255,255,0.9)' },
});

const styles = StyleSheet.create({
  card: {
    maxWidth: 280,
    borderRadius: 18,
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
});

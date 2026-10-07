import React, { memo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import {
  CarFront,
  ChevronRight,
  Instagram,
  Link2,
  MessageCircle,
  MessagesSquare,
} from 'lucide-react-native';
import { InstitutionalTag, InstitutionalText } from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { BORDERS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;

const CANAL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  directo: 'Link libre',
  canal: 'Canal',
};

function fechaCorta(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function CanalIcon({ canal }: { canal: string }) {
  const props = { size: 18, color: I.ink, strokeWidth: ICON_STROKE_WIDTH } as const;
  switch (canal) {
    case 'whatsapp':
      return <MessageCircle {...props} />;
    case 'instagram':
      return <Instagram {...props} />;
    case 'messenger':
      return <MessagesSquare {...props} />;
    case 'directo':
      return <Link2 {...props} />;
    default:
      return <MessageCircle {...props} />;
  }
}

export type CotizacionPendienteRowProps = {
  item: CotizacionCanal;
  onPress: (item: CotizacionCanal) => void;
  last?: boolean;
  /** Tarjeta suelta, como en Cotizaciones. La fila sigue el listado del inicio. */
  presentacion?: 'fila' | 'tarjeta';
};

/**
 * Fila Host Listing: título + monto, vehículo, meta quieta. Un paper padre, no card anidada.
 */
function CotizacionPendienteRowInner({
  item,
  onPress,
  last,
  presentacion = 'fila',
}: CotizacionPendienteRowProps) {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  const canalKey = (item.canal || '').toLowerCase();
  const canal = CANAL_LABELS[canalKey] || (item.es_libre ? 'Link libre' : 'Canal');
  const cliente = (item.cliente_nombre || item.cliente_display || '').trim();
  const vehiculo = [item.vehiculo_marca, item.vehiculo_modelo].filter(Boolean).join(' ');
  const patente = (item.vehiculo_patente || '').trim();
  const total = Number(item.total_clp) || 0;
  const fecha = fechaCorta(item.creado_en);
  const metaBits = [
    canal,
    fecha,
    item.numero_publico ? `#${item.numero_publico}` : '',
    item.estado === 'enviada' && item.entrega_pendiente_compartir ? 'Por compartir' : '',
  ].filter(Boolean);

  if (presentacion === 'tarjeta') {
    const titulo = cliente || item.servicio_nombre || 'Cotización';
    const detalle = [item.servicio_nombre, vehiculo, patente ? patente.toUpperCase() : '']
      .filter(Boolean)
      .join(' · ');
    return (
      <TouchableOpacity
        style={styles.tarjeta}
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <View style={styles.media}>
          <View style={styles.mediaIcono}>
            <CarFront size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <View style={styles.estado}>
            <View style={styles.estadoPunto} />
            <InstitutionalText role="captionBold">Por revisar</InstitutionalText>
          </View>
        </View>
        <View style={styles.tarjetaCopy}>
          <View style={styles.tarjetaTitulo}>
            <InstitutionalText role="bodyBold" numberOfLines={1} style={styles.servicio}>
              {titulo}
            </InstitutionalText>
            {item.numero_publico ? (
              <InstitutionalText role="caption" color="muted">
                {item.numero_publico}
              </InstitutionalText>
            ) : null}
          </View>
          {detalle ? (
            <InstitutionalText role="caption" color="body" numberOfLines={2}>
              {detalle}
            </InstitutionalText>
          ) : null}
          {metaBits.length > 0 ? (
            <InstitutionalText role="caption" color="muted" numberOfLines={1}>
              {metaBits.join(' · ')}
            </InstitutionalText>
          ) : null}
          {total > 0 ? (
            <InstitutionalText role="bodyBold">{formatearMontoCLP(total)}</InstitutionalText>
          ) : (
            <InstitutionalText role="caption" color="muted">Sin precio todavía</InstitutionalText>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={hostIconPlateStyle}>
        <CanalIcon canal={canalKey || (item.es_libre ? 'directo' : 'canal')} />
      </View>

      <View style={styles.body}>
        <View style={styles.line1}>
          <InstitutionalText role="h4" numberOfLines={2} style={styles.servicio}>
            {item.servicio_nombre || 'Servicio por cotizar'}
          </InstitutionalText>
          <View style={styles.priceChevron}>
            {total > 0 ? (
              <InstitutionalText role="numberDisplay" style={styles.precio}>
                {formatearMontoCLP(total)}
              </InstitutionalText>
            ) : (
              <InstitutionalTag label="Sin precio" variant="warning" size="sm" />
            )}
            <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        </View>

        {vehiculo || patente ? (
          <InstitutionalText role="caption" color="ink" numberOfLines={1}>
            {[vehiculo, patente ? patente.toUpperCase() : ''].filter(Boolean).join(' · ')}
          </InstitutionalText>
        ) : null}

        {cliente ? (
          <InstitutionalText role="caption" color="muted" numberOfLines={1}>
            {cliente}
          </InstitutionalText>
        ) : null}

        {item.es_cotizacion_adicional ? (
          <View style={styles.tags}>
            <InstitutionalTag label="Adicional" variant="adicional" size="sm" />
            {item.servicio_principal_nombre ? (
              <InstitutionalText role="small" color="muted" numberOfLines={1} style={styles.tagMeta}>
                Desde {item.servicio_principal_nombre}
                {item.ejecucion_adicional === 'nueva_fecha' ? ' · Nueva fecha' : ''}
              </InstitutionalText>
            ) : null}
          </View>
        ) : null}

        {metaBits.length > 0 ? (
          <InstitutionalText role="small" color="muted" numberOfLines={1}>
            {metaBits.join(' · ')}
          </InstitutionalText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export const CotizacionPendienteRow = memo(CotizacionPendienteRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.fixed.xxs,
  },
  line1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  servicio: {
    flex: 1,
    minWidth: 0,
  },
  priceChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    paddingTop: 2,
  },
  precio: {
    fontSize: TYPOGRAPHY.styles.body.fontSize,
  },
  tarjeta: {
    alignSelf: 'stretch',
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.sm,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.xl,
    backgroundColor: I.paper,
    ...SHADOWS.editorial,
  },
  media: {
    minHeight: 112,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.fixed.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  mediaIcono: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.paper,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  estadoPunto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: I.ink,
  },
  tarjetaCopy: {
    gap: 2,
    paddingHorizontal: SPACING.fixed.xs,
    paddingBottom: SPACING.fixed.xs,
  },
  tarjetaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    flexWrap: 'wrap',
  },
  tagMeta: {
    flex: 1,
    minWidth: 0,
  },
});

export default CotizacionPendienteRow;

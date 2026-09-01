import React, { memo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import {
  ChevronRight,
  Instagram,
  Link2,
  MessageCircle,
  MessagesSquare,
} from 'lucide-react-native';
import { InstitutionalTag, InstitutionalText } from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
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
};

/**
 * Fila Host Listing: título + monto, vehículo, meta quieta. Un paper padre, no card anidada.
 */
function CotizacionPendienteRowInner({ item, onPress, last }: CotizacionPendienteRowProps) {
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
            <InstitutionalTag label="Adicional" variant="info" size="sm" />
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

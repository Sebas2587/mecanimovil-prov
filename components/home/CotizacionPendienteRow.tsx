import React, { memo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import {
  ChevronRight,
  Instagram,
  Link2,
  MessageCircle,
  MessagesSquare,
} from 'lucide-react-native';
import { InstitutionalTag } from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

const CANAL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  directo: 'Link libre',
  canal: 'Canal',
};

const CANAL_VARIANT: Record<string, 'primary' | 'info' | 'neutral' | 'warning'> = {
  whatsapp: 'primary',
  instagram: 'info',
  messenger: 'info',
  directo: 'neutral',
  canal: 'neutral',
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
 * Fila Host dentro de un único paper (HostPaperSection).
 * Prioridad: servicio → canal → cliente/vehículo · precio + chevron juntos.
 */
function CotizacionPendienteRowInner({ item, onPress, last }: CotizacionPendienteRowProps) {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  const canalKey = (item.canal || '').toLowerCase();
  const canal = CANAL_LABELS[canalKey] || (item.es_libre ? 'Link libre' : 'Canal');
  const canalVariant = CANAL_VARIANT[canalKey] || 'neutral';
  const cliente = item.cliente_nombre || item.cliente_display || 'Cliente';
  const vehiculo = [item.vehiculo_marca, item.vehiculo_modelo]
    .filter(Boolean)
    .join(' ');
  const total = Number(item.total_clp) || 0;
  const fecha = fechaCorta(item.creado_en);

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
          <Text style={styles.servicio} numberOfLines={2}>
            {item.servicio_nombre || 'Servicio por cotizar'}
          </Text>
          <View style={styles.priceChevron}>
            {total > 0 ? (
              <Text style={styles.precio}>{formatearMontoCLP(total)}</Text>
            ) : (
              <InstitutionalTag label="Sin precio" variant="warning" size="sm" />
            )}
            <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        </View>

        <View style={styles.line2}>
          {item.es_cotizacion_adicional ? (
            <InstitutionalTag label="Adicional" variant="info" size="sm" uppercase />
          ) : null}
          <InstitutionalTag label={canal} variant={canalVariant} size="sm" uppercase />
          {fecha ? <Text style={styles.fecha}>{fecha}</Text> : null}
        </View>

        {item.es_cotizacion_adicional && item.servicio_principal_nombre ? (
          <Text style={styles.meta} numberOfLines={1}>
            Desde: {item.servicio_principal_nombre}
            {item.ejecucion_adicional === 'nueva_fecha' ? ' · Nueva fecha' : ''}
          </Text>
        ) : null}

        <Text style={styles.meta} numberOfLines={1}>
          {item.numero_publico ? `#${item.numero_publico} · ` : ''}
          {cliente}
          {vehiculo ? ` · ${vehiculo}` : ''}
          {item.vehiculo_patente ? ` · ${item.vehiculo_patente}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export const CotizacionPendienteRow = memo(CotizacionPendienteRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
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
    gap: 6,
  },
  line1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  servicio: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.styles.h4.fontSize,
    lineHeight: Math.round(TYPOGRAPHY.styles.h4.fontSize * 1.25),
    color: I.ink,
  },
  priceChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    paddingTop: 2,
  },
  precio: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    color: I.ink,
  },
  line2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  fecha: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: I.muted,
  },
  meta: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: I.muted,
  },
});

export default CotizacionPendienteRow;

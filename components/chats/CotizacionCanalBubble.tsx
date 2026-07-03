import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FileText } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;

const ESTADO_LABEL: Record<string, string> = {
  enviada: 'Enviada — esperando respuesta',
  aceptada: 'Aceptada por el cliente',
  rechazada: 'Rechazada',
  borrador: 'Borrador',
};

interface CotizacionCanalBubbleProps {
  servicioNombre: string;
  totalClp: number;
  estado: string;
  esPropio: boolean;
}

export function CotizacionCanalBubble({
  servicioNombre,
  totalClp,
  estado,
  esPropio,
}: CotizacionCanalBubbleProps) {
  return (
    <View style={[styles.bubble, esPropio ? styles.bubbleOwn : styles.bubbleOther]}>
      <View style={styles.header}>
        <FileText size={16} color={esPropio ? I.onPrimary : I.primary} strokeWidth={2} />
        <Text style={[styles.title, esPropio && styles.textOnPrimary]}>Cotización</Text>
      </View>
      <Text style={[styles.servicio, esPropio && styles.textOnPrimary]} numberOfLines={2}>
        {servicioNombre}
      </Text>
      <Text style={[styles.total, esPropio && styles.textOnPrimary]}>
        Total: {formatearMontoCLP(totalClp)}
      </Text>
      <Text style={[styles.estado, esPropio && styles.textOnPrimaryMuted]}>
        {ESTADO_LABEL[estado] || estado}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '88%',
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.sm + 2,
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
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  total: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  estado: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
    marginTop: 2,
  },
  textOnPrimary: { color: I.onPrimary },
  textOnPrimaryMuted: { color: 'rgba(255,255,255,0.85)' },
});

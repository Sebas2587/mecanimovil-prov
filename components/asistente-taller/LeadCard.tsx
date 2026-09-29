import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';

const I = COLORS.institutional;

type Props = {
  id: string;
  quien: string;
  telefono: string;
  auto: string;
  pedido: string;
  verboLabel: string;
  estado: string;
  activo: boolean;
  primero?: boolean;
  onPress: (id: string) => void;
};

export const LeadCard = React.memo(function LeadCard({
  id,
  quien,
  telefono,
  auto,
  pedido,
  verboLabel,
  estado,
  activo,
  primero = false,
  onPress,
}: Props) {
  const handlePress = useCallback(() => onPress(id), [id, onPress]);
  const mostrarTelefono = telefono.length > 0 && telefono !== quien;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        activo && styles.cardActiva,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${quien}. ${auto}. ${verboLabel}`}
    >
      <View style={styles.texto}>
        <InstitutionalText role="bodyBold">{quien}</InstitutionalText>
        {mostrarTelefono ? (
          <InstitutionalText role="caption" color="muted">
            {telefono}
          </InstitutionalText>
        ) : null}
        {auto ? (
          <InstitutionalText role="caption">{auto}</InstitutionalText>
        ) : null}
        {pedido ? (
          <InstitutionalText role="caption" color="muted" numberOfLines={2}>
            {pedido}
          </InstitutionalText>
        ) : null}
        {estado ? (
          <InstitutionalText role="caption" color="muted">
            {estado}
          </InstitutionalText>
        ) : null}
      </View>
      <View style={[styles.verbo, primero && styles.verboPrimero]}>
        <InstitutionalText role="captionBold" color={primero ? 'onPrimary' : 'primary'}>
          {verboLabel}
        </InstitutionalText>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: I.paper,
    ...SHADOWS.editorial,
  },
  cardActiva: {
    backgroundColor: I.surfaceSoft,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  texto: {
    flex: 1,
    gap: 2,
  },
  verbo: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  verboPrimero: {
    backgroundColor: I.primary,
  },
});

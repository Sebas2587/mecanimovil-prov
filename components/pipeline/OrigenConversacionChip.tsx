import React, { memo, useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

export type OrigenConversacionChipProps = {
  conversationId: number;
  label?: string;
};

/**
 * Chip de trazabilidad: abre el hilo de chat que originó una orden/cita/oferta,
 * sin reemplazar la tarjeta de la orden por una de conversación.
 */
function OrigenConversacionChipInner({
  conversationId,
  label = 'Ver conversación',
}: OrigenConversacionChipProps) {
  const handlePress = useCallback(() => {
    router.push(`/chat-omnicanal?conversationId=${conversationId}`);
  }, [conversationId]);

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MessageCircle size={12} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
      <InstitutionalText role="small" color="primary">
        {label}
      </InstitutionalText>
    </TouchableOpacity>
  );
}

export const OrigenConversacionChip = memo(OrigenConversacionChipInner);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: COLORS.background.paper,
  },
});

export default OrigenConversacionChip;

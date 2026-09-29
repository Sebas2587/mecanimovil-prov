import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { InstitutionalText } from '@/app/design-system/components';
import { COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

type Props = {
  frase: string;
  onPress: () => void;
};

export const FraseDia = React.memo(function FraseDia({ frase, onPress }: Props) {
  const abrir = useCallback(() => onPress(), [onPress]);

  return (
    <Pressable
      onPress={abrir}
      accessibilityRole="button"
      accessibilityLabel={frase}
      accessibilityHint="Abre el día"
      style={({ pressed }) => [styles.linea, pressed && styles.lineaPressed]}
    >
      <View style={styles.icono}>
        <Calendar size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
      <InstitutionalText role="body" style={styles.texto}>
        {frase}
      </InstitutionalText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  linea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: I.paper,
    ...SHADOWS.editorial,
  },
  lineaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  icono: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceSoft,
  },
  texto: {
    flex: 1,
  },
});

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING } from '@/app/design-system/tokens';

const I = COLORS.institutional;

type Tono = 'coral' | 'grafito' | 'suave';

type Props = {
  label: string;
  onPress: () => void;
  tono?: Tono;
  /** Píldora del encabezado, o botón de hoja con radio amplio. */
  forma?: 'pill' | 'hoja';
  disabled?: boolean;
  loading?: boolean;
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Píldora del taller: coral (10%), grafito (20%) o suave sobre el canvas. */
export function TallerPildora({
  label,
  onPress,
  tono = 'coral',
  forma = 'pill',
  disabled = false,
  loading = false,
  leading,
  style,
}: Props) {
  const bloqueado = disabled || loading;
  const claro = tono === 'coral' || tono === 'grafito';
  const colorTexto = tono === 'coral' ? I.onPrimary : tono === 'grafito' ? I.onDark : I.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={bloqueado}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        forma === 'hoja' && styles.hoja,
        tono === 'coral' && styles.coral,
        tono === 'grafito' && styles.grafito,
        tono === 'suave' && styles.suave,
        bloqueado && styles.off,
        pressed && !bloqueado && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={claro ? I.onPrimary : I.ink} />
      ) : leading ? (
        <View>{leading}</View>
      ) : null}
      <InstitutionalText role="bodyBold" color={colorTexto} numberOfLines={1}>
        {label}
      </InstitutionalText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: BORDERS.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
  },
  hoja: {
    minHeight: 48,
    borderRadius: BORDERS.radius.lg,
    paddingHorizontal: SPACING.fixed.lg,
  },
  coral: {
    backgroundColor: I.primary,
  },
  grafito: {
    backgroundColor: I.surfaceDark,
  },
  suave: {
    backgroundColor: I.surfaceSoft,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  off: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
  },
});

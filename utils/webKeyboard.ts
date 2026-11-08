import { Platform, type ViewStyle } from 'react-native';
import { COLORS } from '@/app/design-system/tokens';

type KeyLike = {
  key?: string;
  nativeEvent?: { key?: string };
  preventDefault?: () => void;
};

/**
 * Activa una acción habilitada con Enter o Space.
 * No dispara si está disabled (incluye loading).
 */
export function activateFromKeyboard(
  event: KeyLike,
  disabled: boolean | undefined,
  onPress?: () => void,
): boolean {
  if (disabled || !onPress) return false;
  const key = event.key ?? event.nativeEvent?.key;
  const code = (event as KeyLike & { code?: string }).code;
  const isEnter = key === 'Enter' || code === 'Enter' || code === 'NumpadEnter';
  const isSpace = key === ' ' || key === 'Spacebar' || code === 'Space';
  if (!isEnter && !isSpace) return false;
  event.preventDefault?.();
  onPress();
  return true;
}

/** Props web para Tab + teclado en Pressable/Touchable. Native: objeto vacío. */
export function webKeyboardProps(
  disabled: boolean | undefined,
  onPress?: () => void,
): Record<string, unknown> {
  if (Platform.OS !== 'web') return {};
  const onKey = (event: KeyLike) => {
    activateFromKeyboard(event, disabled, onPress);
  };
  return {
    tabIndex: disabled ? -1 : 0,
    onKeyDown: onKey,
    onKeyPress: onKey,
  };
}

/** Anillo de foco visible en web (outline RN-web no siempre pinta). */
export const webFocusRingStyle = (
  Platform.OS === 'web'
    ? {
        outlineWidth: 2,
        outlineStyle: 'solid' as const,
        outlineColor: COLORS.border.focus,
        outlineOffset: 2,
        boxShadow: `0 0 0 2px ${COLORS.border.focus}`,
      }
    : {
        borderWidth: 2,
        borderColor: COLORS.border.focus,
      }
) as ViewStyle;

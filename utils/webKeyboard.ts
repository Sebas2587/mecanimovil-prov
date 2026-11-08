import { Platform } from 'react-native';

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
  if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return false;
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
  return {
    tabIndex: disabled ? -1 : 0,
    onKeyDown: (event: KeyLike) => {
      activateFromKeyboard(event, disabled, onPress);
    },
  };
}

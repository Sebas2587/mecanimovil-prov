import { Platform, type ViewStyle } from 'react-native';

export type ShadowStyleInput = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

function parseHexColor(color: string): { r: number; g: number; b: number } | null {
  const hex = color.replace('#', '');
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  return null;
}

/** Misma lógica que react-native-web `createBoxShadowValue`. */
export function createBoxShadowString(shadow: ShadowStyleInput): string | undefined {
  const {
    shadowColor = '#000000',
    shadowOffset = { width: 0, height: 0 },
    shadowOpacity = 0.25,
    shadowRadius = 0,
  } = shadow;

  if (shadowColor === 'transparent' || shadowOpacity === 0) {
    return undefined;
  }

  const width = shadowOffset?.width ?? 0;
  const height = shadowOffset?.height ?? 0;
  const colorValue = typeof shadowColor === 'string' ? shadowColor : String(shadowColor);
  const rgb = parseHexColor(colorValue);
  const color = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${shadowOpacity})`
    : colorValue;

  return `${width}px ${height}px ${shadowRadius}px ${color}`;
}

/** Sombras multiplataforma: shadow* en nativo, boxShadow en web (sin warns de RN Web). */
export function platformShadow(shadow: ShadowStyleInput): ViewStyle {
  if (Platform.OS !== 'web') {
    return shadow;
  }

  const boxShadow = createBoxShadowString(shadow);
  return boxShadow ? { boxShadow } : {};
}

export function platformShadowMap<T extends Record<string, ShadowStyleInput>>(
  shadows: T,
): Record<keyof T, ViewStyle> {
  return Object.fromEntries(
    Object.entries(shadows).map(([key, value]) => [key, platformShadow(value)]),
  ) as Record<keyof T, ViewStyle>;
}

/** Sin sombra (headers, variantes deshabilitadas). */
export const noShadow = platformShadow({
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
});

/** pointerEvents como style (requerido en RN Web). */
export const pointerEventsNone = { pointerEvents: 'none' as const };

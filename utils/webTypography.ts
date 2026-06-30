import { Platform } from 'react-native';

/** En RN Web, lineHeight multiplicador + overflow/flex puede colapsar el texto a 1px. */
export function pixelLineHeight(fontSize: number, multiplier: number): number {
  return Math.round(fontSize * multiplier);
}

export function withWebLineHeight<T extends { fontSize?: number; lineHeight?: number }>(
  style: T,
): T {
  if (Platform.OS !== 'web') return style;
  const fontSize = style.fontSize;
  const lineHeight = style.lineHeight;
  if (fontSize == null || lineHeight == null) return style;
  if (lineHeight > 4) return style;
  return {
    ...style,
    lineHeight: pixelLineHeight(fontSize, lineHeight),
  };
}

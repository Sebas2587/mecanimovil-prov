import { COLORS } from '../tokens';

const I = COLORS.institutional;

/**
 * Switch Host: neutro (sin verde iOS ni magenta).
 * Off/on en grises del sistema visual Host.
 */
export const institutionalSwitchProps = {
  trackColor: {
    false: I.surfaceStrong,
    true: I.muted,
  },
  thumbColor: I.onPrimary,
  ios_backgroundColor: I.surfaceStrong,
} as const;

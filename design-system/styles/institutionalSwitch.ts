import { COLORS } from '../tokens';

const I = COLORS.institutional;

/**
 * @deprecated Usar HostSwitch. El Switch nativo en web ignora estos colores.
 * Activo = negro Airbnb (ink). Apagado = gris de superficie.
 */
export const institutionalSwitchProps = {
  trackColor: {
    false: I.surfaceStrong,
    true: I.ink,
  },
  thumbColor: I.onPrimary,
  ios_backgroundColor: I.surfaceStrong,
} as const;

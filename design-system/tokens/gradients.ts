import { COLORS } from './colors';

/**
 * Gradiente primario Tinder — cromo / marca (MAGENTA→ORANGE).
 * `hostCtaOnText` usa 700 existentes: blanco sobre el peor stop ≥ 4.5 (texto 15px).
 * MAGENTA de marca no se altera.
 */
export const GRADIENTS = {
  guestCta: [COLORS.brand.magenta, COLORS.brand.orange] as const,
  guestCtaLocations: [0, 1] as const,
  hostCta: [COLORS.brand.magenta, COLORS.brand.orange] as const,
  hostCtaOnText: [COLORS.primary[700], COLORS.accent[700]] as const,
  hostCtaLocations: [0, 1] as const,
};

export default GRADIENTS;

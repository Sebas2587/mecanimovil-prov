import { HOST_GUTTER } from '@/app/design-system/styles/hostLayout';
import { SPACING } from '@/app/design-system/tokens';

export const COTIZACION_FAB_SIZE = 56;
/** Alto aproximado de la barra de acciones del borrador, sin el inset seguro. */
const FOOTER_ACCIONES = 96;

export function cotizacionFabLayout(opts: {
  showFooter: boolean;
  footerBottom: number;
}): { bottomOffset: number; paddingBottom: number; paddingRight: number; gutterFab: number } {
  const gap = SPACING.fixed.sm;
  /** Carril a la derecha: el + (56) + aire (lg). Va en un spacer real, no en padding. */
  const gutterFab = COTIZACION_FAB_SIZE + SPACING.fixed.lg;
  return {
    bottomOffset: opts.showFooter
      ? opts.footerBottom + FOOTER_ACCIONES + gap
      : opts.footerBottom + SPACING.fixed.lg,
    paddingBottom: COTIZACION_FAB_SIZE + SPACING.fixed.lg,
    paddingRight: HOST_GUTTER + gutterFab,
    gutterFab,
  };
}

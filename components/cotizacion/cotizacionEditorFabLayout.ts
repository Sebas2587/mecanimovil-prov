import { SPACING } from '@/app/design-system/tokens';

export const COTIZACION_FAB_SIZE = 56;
/** Alto aproximado de la barra de acciones del borrador, sin el inset seguro. */
const FOOTER_ACCIONES = 96;

export function cotizacionFabLayout(opts: {
  showFooter: boolean;
  footerBottom: number;
  showFab?: boolean;
}): { bottomOffset: number; paddingBottom: number } {
  const gap = SPACING.fixed.sm;
  const showFab = Boolean(opts.showFab);
  return {
    bottomOffset: opts.showFooter
      ? opts.footerBottom + FOOTER_ACCIONES + gap
      : opts.footerBottom + SPACING.fixed.lg,
    paddingBottom: showFab
      ? COTIZACION_FAB_SIZE + SPACING.fixed.lg
      : SPACING.fixed.lg,
  };
}

import { HOST_GUTTER } from '@/app/design-system/styles/hostLayout';
import { SPACING } from '@/app/design-system/tokens';
import { COTIZACION_FAB_SIZE, cotizacionFabLayout } from '@/components/cotizacion/cotizacionEditorFabLayout';

describe('cotizacionFabLayout', () => {
  it('deja el + encima de la barra y reserva aire al contenido', () => {
    const layout = cotizacionFabLayout({ showFooter: true, footerBottom: 36 });
    expect(layout.bottomOffset).toBeGreaterThan(36 + 96);
    expect(layout.paddingBottom).toBe(COTIZACION_FAB_SIZE + SPACING.fixed.lg);
    expect(layout.gutterFab).toBe(COTIZACION_FAB_SIZE + SPACING.fixed.lg);
    expect(layout.paddingRight).toBe(HOST_GUTTER + layout.gutterFab);
  });

  it('sin pie sigue apartando el botón del borde', () => {
    const layout = cotizacionFabLayout({ showFooter: false, footerBottom: 12 });
    expect(layout.bottomOffset).toBe(12 + SPACING.fixed.lg);
    expect(layout.paddingRight).toBeGreaterThan(COTIZACION_FAB_SIZE);
  });
});

import { SPACING } from '@/app/design-system/tokens';
import { COTIZACION_FAB_SIZE, cotizacionFabLayout } from '@/components/cotizacion/cotizacionEditorFabLayout';

describe('cotizacionFabLayout', () => {
  it('con FAB deja aire abajo para no tapar el último contenido', () => {
    const layout = cotizacionFabLayout({ showFooter: true, footerBottom: 36, showFab: true });
    expect(layout.bottomOffset).toBeGreaterThan(36 + 96);
    expect(layout.paddingBottom).toBe(COTIZACION_FAB_SIZE + SPACING.fixed.lg);
  });

  it('sin FAB no reserva carril ni aire extra', () => {
    const layout = cotizacionFabLayout({ showFooter: true, footerBottom: 36, showFab: false });
    expect(layout.paddingBottom).toBe(SPACING.fixed.lg);
  });

  it('sin pie sigue apartando el botón del borde', () => {
    const layout = cotizacionFabLayout({ showFooter: false, footerBottom: 12, showFab: true });
    expect(layout.bottomOffset).toBe(12 + SPACING.fixed.lg);
  });
});

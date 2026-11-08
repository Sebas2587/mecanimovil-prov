import { COLORS } from '@/app/design-system/tokens';

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const srgb = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

describe('contraste de tokens vigentes', () => {
  it('tab inactiva usa body #757575 sobre paper (>= 4.5)', () => {
    const r = contrastRatio(COLORS.tab.unselected, COLORS.background.paper);
    expect(r).toBeGreaterThanOrEqual(4.5);
  });

  it('tertiary usa primary.700 sobre blanco (>= 4.5)', () => {
    const r = contrastRatio(COLORS.primary[700], '#FFFFFF');
    expect(r).toBeGreaterThanOrEqual(4.5);
  });

  it('ink sobre canvas y paper cumple AA texto', () => {
    expect(contrastRatio(COLORS.institutional.ink, COLORS.institutional.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORS.institutional.ink, COLORS.institutional.paper)).toBeGreaterThanOrEqual(4.5);
  });

  it('MAGENTA no se oscurece: el token de marca sigue #FD2B7B', () => {
    expect(COLORS.institutional.primary).toBe('#FD2B7B');
    expect(COLORS.brand.magenta).toBe('#FD2B7B');
  });
});

import { COLORS, GRADIENTS } from '@/app/design-system/tokens';
import { institutionalTypographyStyles } from '@/app/design-system/styles/institutionalTypography';

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

  it('texto secundario vivo (muted) no es TAB_MUTED y cumple 4.5 sobre paper/blanco', () => {
    expect(COLORS.institutional.muted).toBe(COLORS.institutional.body);
    expect(COLORS.institutional.muted).toBe('#757575');
    expect(COLORS.institutional.muted).not.toBe('#B8B8B8');
    expect(institutionalTypographyStyles.muted.color).toBe('#757575');
    expect(contrastRatio(COLORS.institutional.muted, COLORS.institutional.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORS.institutional.muted, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORS.institutional.body, COLORS.institutional.paper)).toBeGreaterThanOrEqual(4.5);
    // caption 13px / small 11px son texto normal → 4.5, no umbral large 3:1
    expect(contrastRatio('#757575', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('TAB_MUTED queda para disabled/terciario, no para leyendas estáticas', () => {
    expect(COLORS.text.disabled).toBe('#C4C4C4');
    expect(COLORS.text.tertiary).toBe('#B8B8B8');
    expect(contrastRatio(COLORS.text.tertiary, '#FFFFFF')).toBeLessThan(4.5);
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
    expect(GRADIENTS.hostCta[0]).toBe('#FD2B7B');
    expect(GRADIENTS.hostCta[1]).toBe('#FF7158');
  });

  it('gradiente bajo texto: peor stop con blanco >= 4.5 (texto 15px)', () => {
    const ratios = GRADIENTS.hostCtaOnText.map((stop) => contrastRatio('#FFFFFF', stop));
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4.5);
  });

  it('success activo usa success.dark + blanco >= 4.5', () => {
    expect(contrastRatio('#FFFFFF', COLORS.success.dark)).toBeGreaterThanOrEqual(4.5);
  });

  it('snackbar success/warning/error/info texto sobre paper >= 4.5', () => {
    expect(contrastRatio(COLORS.success.darker, COLORS.institutional.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORS.warning.darker, COLORS.institutional.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORS.error.dark, COLORS.institutional.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORS.primary[700], COLORS.institutional.paper)).toBeGreaterThanOrEqual(4.5);
  });

  it('warning.main sobre blanco no alcanza 4.5; el texto vivo usa warning.darker', () => {
    expect(contrastRatio(COLORS.warning.main, '#FFFFFF')).toBeLessThan(4.5);
    expect(contrastRatio(COLORS.warning.darker, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });
});

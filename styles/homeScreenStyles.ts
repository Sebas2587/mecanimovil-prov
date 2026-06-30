/**
 * Estilos temáticos Home (proveedores) — DESIGN_PROVEEDORES_INSTITUCIONAL.md
 * Superficies planas + hairline + SHADOWS.editorial; sin glass/blur decorativo.
 */
import { StyleSheet } from 'react-native';
import { SHADOWS } from '@/app/design-system/tokens/shadows';
import { TYPOGRAPHY } from '@/app/design-system/tokens/typography';
import { SPACING } from '@/app/design-system/tokens/spacing';
import { BORDERS } from '@/app/design-system/tokens/borders';

export type HomeScreenPalette = {
  canvas: string;
  surfaceSoft: string;
  surfaceStrong: string;
  ink: string;
  body: string;
  muted: string;
  mutedSoft: string;
  hairline: string;
  hairlineSoft: string;
  primary: string;
  primaryActive: string;
  semanticUp: string;
  semanticDown: string;
  accentYellow: string;
  onPrimary: string;
  /** Texto/icono énfasis sobre fondos warning suaves (token `COLORS.warning.text`). */
  warningEmphasis: string;
};

/** Una sola familia sans (Inter) para títulos, subtítulos y párrafos; mono solo en tabular. */
export type HomeScreenFonts = {
  sansRegular: string;
  sansMedium: string;
  sansSemiBold: string;
  mono: string;
};

export type HomeScreenLayout = {
  horizontalPadding: number;
  sectionMarginBottom: number;
  radiusCard: number;
  radiusMd: number;
  radiusSm: number;
  avatarSize: number;
};

function lineHeightPx(
  fontSize: number,
  lineHeight: number | string,
): number {
  const mult = typeof lineHeight === 'number' ? lineHeight : parseFloat(String(lineHeight));
  return Math.round(fontSize * (Number.isFinite(mult) ? mult : TYPOGRAPHY.lineHeight.normal));
}

export function createHomeScreenStyles(
  c: HomeScreenPalette,
  f: HomeScreenFonts,
  L: HomeScreenLayout,
) {
  const avatarR = L.avatarSize / 2;
  const padCard = SPACING.fixed.lg;
  const gapGrid = SPACING.fixed.sm;

  const h2 = TYPOGRAPHY.styles.h2;
  const h3 = TYPOGRAPHY.styles.h3;
  const h4 = TYPOGRAPHY.styles.h4;
  const body = TYPOGRAPHY.styles.body;
  const caption = TYPOGRAPHY.styles.caption;
  const small = TYPOGRAPHY.styles.small;
  const captionBold = TYPOGRAPHY.styles.captionBold;
  const numberDisplay = TYPOGRAPHY.styles.numberDisplay;

  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: L.horizontalPadding,
      paddingVertical: SPACING.fixed.sm,
      backgroundColor: c.canvas,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.hairlineSoft,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.fixed.sm,
      flex: 1,
    },
    avatar: {
      width: L.avatarSize,
      height: L.avatarSize,
      borderRadius: avatarR,
      borderWidth: 1,
      borderColor: c.hairline,
    },
    avatarPlaceholder: {
      width: L.avatarSize,
      height: L.avatarSize,
      borderRadius: avatarR,
      backgroundColor: c.surfaceStrong,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.hairline,
    },
    avatarInitial: {
      fontSize: h4.fontSize,
      lineHeight: lineHeightPx(h4.fontSize, h4.lineHeight),
      fontFamily: f.sansSemiBold,
      color: c.primary,
    },
    /** Overline / etiqueta: caption + medium (alineado a caption / nav del DS). */
    welcomeLabel: {
      fontSize: caption.fontSize,
      lineHeight: lineHeightPx(caption.fontSize, caption.lineHeight),
      color: c.muted,
      fontFamily: f.sansMedium,
      textTransform: 'uppercase',
      letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    },
    /** Nombre proveedor: title-md equivalente (h4 18 / semibold). */
    providerName: {
      fontSize: h4.fontSize,
      lineHeight: lineHeightPx(h4.fontSize, h4.lineHeight),
      fontFamily: f.sansSemiBold,
      color: c.ink,
    },
    bellOuter: {
      position: 'relative',
    },
    /** Botón campana: placa surfaceStrong (patrón search-pill / icon plate del doc). */
    bellButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.surfaceStrong,
      borderWidth: 1,
      borderColor: c.hairline,
    },
    bellDot: {
      position: 'absolute',
      top: 2,
      right: 2,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.semanticDown,
      borderWidth: 2,
      borderColor: c.canvas,
    },
    sectionWrap: {
      paddingHorizontal: L.horizontalPadding,
      marginBottom: L.sectionMarginBottom,
    },
    dashboardDualRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: gapGrid,
    },
    dashboardDualCol: {
      flex: 1,
      minWidth: 0,
    },
    dashboardDualStack: {
      gap: gapGrid,
    },
    alertsStack: {
      gap: SPACING.fixed.xs,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.fixed.xs,
      marginBottom: SPACING.fixed.sm,
    },
    /** Título de sección: h2 institucional (24 / 400, display calmo). */
    sectionTitleText: {
      fontSize: h2.fontSize,
      lineHeight: lineHeightPx(h2.fontSize, h2.lineHeight),
      letterSpacing: h2.letterSpacing,
      fontFamily: f.sansRegular,
      color: c.ink,
    },
    radarAvailabilityCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.fixed.sm,
      padding: SPACING.fixed.md,
      borderRadius: L.radiusCard,
      backgroundColor: c.canvas,
      borderWidth: 1,
      borderColor: c.hairline,
      ...SHADOWS.editorial,
    },
    radarAvailabilityIcon: {
      width: 44,
      height: 44,
      borderRadius: L.radiusMd,
      backgroundColor: c.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /** Subtítulo de fila / tarjeta: h4 (18 / 600). */
    radarAvailabilityTitle: {
      fontSize: h4.fontSize,
      lineHeight: lineHeightPx(h4.fontSize, h4.lineHeight),
      fontFamily: f.sansSemiBold,
      color: c.ink,
      marginBottom: SPACING.fixed.xs,
    },
    /** Párrafo secundario: body-md (16 / 400). */
    radarAvailabilitySub: {
      fontSize: body.fontSize,
      lineHeight: lineHeightPx(body.fontSize, body.lineHeight),
      fontFamily: f.sansRegular,
      color: c.body,
    },
    radarInactiveBox: {
      alignItems: 'center',
      paddingVertical: SPACING.fixed.lg,
      paddingHorizontal: SPACING.fixed.md,
      gap: SPACING.fixed.xs,
      borderRadius: L.radiusCard,
      backgroundColor: c.surfaceSoft,
      borderWidth: 1,
      borderColor: c.hairline,
    },
    /** Subtítulo estado vacío: title-sm equivalente (h3 20 / 600). */
    radarInactiveTitle: {
      fontSize: h3.fontSize,
      lineHeight: lineHeightPx(h3.fontSize, h3.lineHeight),
      fontFamily: f.sansSemiBold,
      color: c.body,
    },
    /** Párrafo: body-sm (14 / 400). */
    radarInactiveSub: {
      fontSize: small.fontSize,
      lineHeight: lineHeightPx(small.fontSize, small.lineHeight),
      fontFamily: f.sansRegular,
      color: c.muted,
      textAlign: 'center',
    },
    cardOuter: {
      borderRadius: L.radiusCard,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.hairline,
      backgroundColor: c.canvas,
      ...SHADOWS.editorial,
    },
    cardInner: {
      padding: padCard,
      backgroundColor: c.canvas,
    },
    finHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.fixed.md,
    },
    /** Rótulo mayúsculas: caption-strong (12 / 600). */
    finHeaderTitle: {
      fontSize: captionBold.fontSize,
      lineHeight: lineHeightPx(captionBold.fontSize, captionBold.lineHeight),
      fontFamily: f.sansSemiBold,
      color: c.muted,
      letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    },
    planBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.fixed.xs,
      backgroundColor: c.canvas,
      paddingHorizontal: SPACING.fixed.sm,
      paddingVertical: SPACING.fixed.xxs,
      borderRadius: BORDERS.radius.pill,
      borderWidth: 1,
      borderColor: c.hairline,
    },
    planBadgeText: {
      fontSize: small.fontSize,
      lineHeight: lineHeightPx(small.fontSize, small.lineHeight),
      fontFamily: f.sansSemiBold,
      color: c.primary,
    },
    planBadgeDestacado: {
      borderColor: withAlpha(c.accentYellow, 0.55),
      backgroundColor: withAlpha(c.accentYellow, 0.12),
    },
    planBadgeTextDestacado: {
      color: c.warningEmphasis,
    },
    finBody: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    finCol: {
      flex: 1,
      alignItems: 'center',
      gap: SPACING.fixed.xxs,
    },
    finDivider: {
      width: 1,
      backgroundColor: c.hairline,
      alignSelf: 'stretch',
      marginHorizontal: SPACING.fixed.sm,
    },
    finIconAmber: {
      width: 44,
      height: 44,
      borderRadius: L.radiusMd,
      backgroundColor: c.surfaceStrong,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.fixed.xxs,
    },
    finIconGreen: {
      width: 44,
      height: 44,
      borderRadius: L.radiusMd,
      backgroundColor: c.surfaceStrong,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.fixed.xxs,
    },
    finLabel: {
      fontSize: caption.fontSize,
      lineHeight: lineHeightPx(caption.fontSize, caption.lineHeight),
      color: c.body,
      fontFamily: f.sansRegular,
    },
    /** Cifra destacada: escala mayor pero misma mono tabular del DS. */
    finCreditsVal: {
      fontSize: TYPOGRAPHY.fontSize['3xl'],
      lineHeight: lineHeightPx(TYPOGRAPHY.fontSize['3xl'], numberDisplay.lineHeight),
      fontFamily: f.mono,
      color: c.ink,
    },
    finBuyMore: {
      fontSize: small.fontSize,
      lineHeight: lineHeightPx(small.fontSize, small.lineHeight),
      color: c.primary,
      fontFamily: f.sansSemiBold,
      marginTop: SPACING.fixed.xxs,
    },
    finEarningsVal: {
      fontSize: numberDisplay.fontSize,
      lineHeight: lineHeightPx(numberDisplay.fontSize, numberDisplay.lineHeight),
      fontFamily: f.mono,
      color: c.ink,
    },
    finEarningsHint: {
      fontSize: caption.fontSize,
      lineHeight: lineHeightPx(caption.fontSize, caption.lineHeight),
      fontFamily: f.sansRegular,
      color: c.muted,
      textAlign: 'center',
      marginTop: SPACING.fixed.xxs,
    },
    finGrowth: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.fixed.xxs,
      paddingVertical: SPACING.fixed.xxs,
      marginTop: SPACING.fixed.xxs,
      backgroundColor: 'transparent',
    },
    finGrowthText: {
      fontSize: numberDisplay.fontSize,
      lineHeight: lineHeightPx(numberDisplay.fontSize, numberDisplay.lineHeight),
      fontFamily: f.mono,
      color: c.semanticUp,
    },
    radarBody: {
      marginTop: SPACING.fixed.md,
      gap: gapGrid,
    },
    radarSearching: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.fixed.lg,
      gap: SPACING.fixed.sm,
    },
    radarEmpty: {
      alignItems: 'center',
      paddingVertical: SPACING.fixed.lg,
      gap: SPACING.fixed.xs,
    },
    radarEmptyTitle: {
      fontSize: h4.fontSize,
      lineHeight: lineHeightPx(h4.fontSize, h4.lineHeight),
      fontFamily: f.sansSemiBold,
      color: c.body,
    },
    radarEmptySub: {
      fontSize: body.fontSize,
      lineHeight: lineHeightPx(body.fontSize, body.lineHeight),
      fontFamily: f.sansRegular,
      color: c.muted,
      textAlign: 'center',
    },
    seeAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.fixed.xs,
      gap: SPACING.fixed.xxs,
    },
    seeAllBtnText: {
      fontSize: TYPOGRAPHY.styles.button.fontSize,
      lineHeight: lineHeightPx(
        TYPOGRAPHY.styles.button.fontSize,
        TYPOGRAPHY.styles.button.lineHeight,
      ),
      fontFamily: f.sansSemiBold,
      color: c.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.canvas,
    },
    loadingText: {
      marginTop: SPACING.fixed.md,
      fontSize: body.fontSize,
      lineHeight: lineHeightPx(body.fontSize, body.lineHeight),
      fontFamily: f.sansRegular,
      color: c.body,
    },
    /** Título bloque gestión: mismo nivel que título de sección (h2). */
    mgmtTitle: {
      fontSize: h2.fontSize,
      lineHeight: lineHeightPx(h2.fontSize, h2.lineHeight),
      letterSpacing: h2.letterSpacing,
      fontFamily: f.sansRegular,
      color: c.ink,
      marginBottom: SPACING.fixed.sm,
    },
    mgmtGrid: {
      gap: gapGrid,
    },
    mgmtRow: {
      flexDirection: 'row',
      gap: gapGrid,
    },
    mgmtCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.fixed.sm,
      padding: SPACING.fixed.md,
      borderRadius: L.radiusCard,
      backgroundColor: c.canvas,
      borderWidth: 1,
      borderColor: c.hairline,
      ...SHADOWS.editorial,
      overflow: 'hidden',
    },
    mgmtCardTextCol: {
      flex: 1,
      minWidth: 0,
    },
    mgmtIconBox: {
      width: 44,
      height: 44,
      borderRadius: L.radiusMd,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.surfaceStrong,
    },
    /** Título tarjeta: title-sm (16 / 600) → h4 tamaño cercano; usamos md + semibold. */
    mgmtCardTitle: {
      fontSize: body.fontSize,
      lineHeight: lineHeightPx(body.fontSize, TYPOGRAPHY.styles.bodyBold.lineHeight),
      fontFamily: f.sansSemiBold,
      color: c.ink,
    },
    mgmtCardSub: {
      fontSize: caption.fontSize,
      lineHeight: lineHeightPx(caption.fontSize, caption.lineHeight),
      fontFamily: f.sansRegular,
      color: c.muted,
      marginTop: 1,
    },
    suscBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: withAlpha(c.accentYellow, 0.12),
      borderRadius: L.radiusMd,
      padding: SPACING.fixed.sm,
      gap: SPACING.fixed.sm,
      borderWidth: 1,
      borderColor: withAlpha(c.accentYellow, 0.35),
    },
    suscBannerWarning: {
      backgroundColor: withAlpha(c.accentYellow, 0.12),
      borderColor: withAlpha(c.accentYellow, 0.35),
    },
    suscBannerDanger: {
      backgroundColor: withAlpha(c.semanticDown, 0.08),
      borderColor: withAlpha(c.semanticDown, 0.25),
    },
    suscBannerIcon: {
      width: 36,
      height: 36,
      borderRadius: L.radiusSm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    suscBannerTitle: {
      fontSize: h4.fontSize,
      lineHeight: lineHeightPx(h4.fontSize, h4.lineHeight),
      fontFamily: f.sansSemiBold,
      color: c.warningEmphasis,
      marginBottom: SPACING.fixed.xxs,
    },
    suscBannerMsg: {
      fontSize: small.fontSize,
      lineHeight: lineHeightPx(small.fontSize, small.lineHeight),
      fontFamily: f.sansRegular,
      color: c.body,
    },
  });
}

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

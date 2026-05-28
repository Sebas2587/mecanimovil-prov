/**
 * Onboarding proveedor — Coinbase / institucional (DESIGN_PROVEEDORES + OpenSpec design-system).
 * Solo estilos compartidos; la lógica vive en cada pantalla.
 */
import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '../tokens';
import { INSTITUTIONAL_SELECTION } from './institutionalSelection';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const hx = SPACING.container.horizontal;

/** Ancho máximo del contenido en web/tablet (legibilidad tipo Coinbase). */
export const ONBOARDING_CONTENT_MAX_WIDTH = 560;

export const ONBOARDING = {
  screen: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  } satisfies ViewStyle,
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? ONBOARDING_CONTENT_MAX_WIDTH : undefined,
    alignSelf: 'center',
  } satisfies ViewStyle,
  scrollView: {
    flex: 1,
  } satisfies ViewStyle,
  scrollContent: {
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.lg,
  } satisfies ViewStyle,
  panel: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.lg,
    ...SHADOWS.editorial,
  } satisfies ViewStyle,
  footer: {
    backgroundColor: I.canvas,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  } satisfies ViewStyle,
  primaryButton: {
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.pill,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  } satisfies ViewStyle,
  primaryButtonDisabled: {
    backgroundColor: I.primaryDisabled,
  } satisfies ViewStyle,
  primaryButtonText: {
    color: I.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  } satisfies TextStyle,
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    backgroundColor: withOpacity(I.primary, 0.06),
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.2),
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
  } satisfies ViewStyle,
  noticeText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
    lineHeight: 20,
  } satisfies TextStyle,
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  } satisfies ViewStyle,
  searchInput: {
    flex: 1,
    marginLeft: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansRegular,
    color: I.ink,
    paddingVertical: SPACING.fixed.xs,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as object : {}),
  } satisfies TextStyle,
  optionCard: INSTITUTIONAL_SELECTION.cardShell,
  optionCardBody: INSTITUTIONAL_SELECTION.cardInset,
  optionCardSelected: INSTITUTIONAL_SELECTION.cardSelected,
  optionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  } satisfies TextStyle,
  optionTitleSelected: {
    color: I.primary,
  } satisfies TextStyle,
  optionDescription: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: 22,
    marginTop: SPACING.fixed.xs,
  } satisfies TextStyle,
  multimarcaToggle: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.medium,
    borderColor: I.hairline,
    marginBottom: SPACING.fixed.md,
    overflow: 'hidden',
    ...SHADOWS.editorial,
  } satisfies ViewStyle,
  multimarcaToggleBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.md,
  } satisfies ViewStyle,
  multimarcaToggleActive: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  } satisfies ViewStyle,
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.xs,
  } satisfies TextStyle,
  input: {
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansRegular,
    color: I.ink,
    backgroundColor: I.canvas,
  } satisfies TextStyle,
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.lg,
  } satisfies ViewStyle,
  loadingText: {
    marginTop: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
  } satisfies TextStyle,
} as const;

/** Color para placeholder de inputs en onboarding. */
export const onboardingInputPlaceholder = I.mutedSoft;

export const onboardingStyles = StyleSheet.create({
  ...ONBOARDING,
  optionsStack: {
    gap: SPACING.fixed.md,
    marginTop: SPACING.fixed.sm,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
  },
  tertiaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.surfaceSoft,
    alignSelf: 'flex-start',
    marginBottom: SPACING.fixed.md,
  },
  tertiaryLinkText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  selectionItem: {
    ...INSTITUTIONAL_SELECTION.listRowShell,
    marginBottom: SPACING.fixed.sm,
  },
  selectionItemBody: {
    ...INSTITUTIONAL_SELECTION.listRowInset,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  selectionItemSelected: {
    ...INSTITUTIONAL_SELECTION.listRowSelected,
    marginBottom: SPACING.fixed.sm,
  },
  /** Contenedor de grupo (p. ej. catálogo por marca) — mismo inset que panel sin sombra extra */
  groupCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.medium,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
    overflow: 'hidden',
  },
});

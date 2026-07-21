/**
 * Inputs canónicos Airbnb Hosts + tipografía Poppins / tokens Tinder.
 * Usar vía InstitutionalField o estos estilos en TextInput sueltos.
 */
import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '../tokens';
import { institutionalTextStyle } from './institutionalTypography';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const T = TYPOGRAPHY.styles;

export const institutionalInputPlaceholder = I.mutedSoft;

export const institutionalInputStyles = StyleSheet.create({
  field: {
    gap: SPACING.fixed.xxs,
  } satisfies ViewStyle,
  label: {
    ...institutionalTextStyle('label', I.ink),
    marginBottom: SPACING.fixed.xxs,
  } satisfies TextStyle,
  hint: {
    ...institutionalTextStyle('caption', I.muted),
    marginBottom: SPACING.fixed.xxs,
  } satisfies TextStyle,
  /** Campo de texto estándar (altura ~52, radius 16, canvas). */
  input: {
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.md,
    minHeight: 52,
    fontSize: T.body.fontSize,
    lineHeight: Math.round(T.body.fontSize * T.body.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.ink,
    backgroundColor: I.canvas,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  } satisfies TextStyle,
  inputCompact: {
    minHeight: 44,
    paddingVertical: SPACING.fixed.sm,
    fontSize: T.caption.fontSize,
    lineHeight: Math.round(T.caption.fontSize * T.caption.lineHeight),
  } satisfies TextStyle,
  /** Montos / cantidades (Poppins Medium — Host). */
  inputMono: {
    fontFamily: FF.monoMedium,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: SPACING.fixed.md,
  } satisfies TextStyle,
  inputError: {
    borderColor: I.semanticDown,
    borderWidth: BORDERS.width.medium,
  } satisfies TextStyle,
  errorText: {
    ...institutionalTextStyle('caption', I.semanticDown),
    fontFamily: FF.sansMedium,
    marginTop: SPACING.fixed.xxs,
  } satisfies TextStyle,
  /** Fila tipo teléfono (+56 | input). */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.canvas,
    paddingHorizontal: SPACING.fixed.md,
    minHeight: 52,
  } satisfies ViewStyle,
  inputRowPrefix: {
    fontSize: T.body.fontSize,
    fontFamily: FF.monoMedium,
    color: I.ink,
  } satisfies TextStyle,
  inputRowField: {
    flex: 1,
    minWidth: 0,
    fontSize: T.body.fontSize,
    fontFamily: FF.sansRegular,
    color: I.ink,
    paddingVertical: SPACING.fixed.sm,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  } satisfies TextStyle,
});

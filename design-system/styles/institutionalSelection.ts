/**
 * Patrones de selección — DESIGN_PROVEEDORES_INSTITUCIONAL (adaptación RN).
 * Ítem seleccionado: fondo canvas (blanco), borde primario; sin surfaceStrong ni primary[50] de relleno.
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '../tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

/** Inset estándar de cards/filas (OpenSpec / Coinbase). */
export const INSTITUTIONAL_CARD_INSET = {
  horizontal: SPACING.fixed.md,
  vertical: SPACING.fixed.md,
} as const;

/** Borde fijo en todos los estados para que el contenido no “salte” al seleccionar. */
const CARD_BORDER_WIDTH = BORDERS.width.medium;

export const INSTITUTIONAL_SELECTION = {
  /** Solo borde/radio (onboarding: combinar con `cardInset` en hijo). */
  cardShell: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.xl,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: I.hairline,
    overflow: 'hidden',
  } satisfies ViewStyle,
  cardInset: {
    paddingHorizontal: INSTITUTIONAL_CARD_INSET.horizontal,
    paddingVertical: INSTITUTIONAL_CARD_INSET.vertical,
  } satisfies ViewStyle,
  /** Tarjeta con borde + padding (pantallas fuera de onboarding). */
  card: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.xl,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: I.hairline,
    overflow: 'hidden',
    paddingHorizontal: INSTITUTIONAL_CARD_INSET.horizontal,
    paddingVertical: INSTITUTIONAL_CARD_INSET.vertical,
  } satisfies ViewStyle,
  /** Tarjeta seleccionada — solo cambia color de borde */
  cardSelected: {
    backgroundColor: I.canvas,
    borderColor: I.primary,
  } satisfies ViewStyle,
  listRowShell: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: I.hairline,
    overflow: 'hidden',
  } satisfies ViewStyle,
  listRowInset: {
    paddingHorizontal: INSTITUTIONAL_CARD_INSET.horizontal,
    paddingVertical: INSTITUTIONAL_CARD_INSET.vertical,
  } satisfies ViewStyle,
  /** Fila lista con borde + padding (compat). */
  listRow: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: I.hairline,
    overflow: 'hidden',
    paddingHorizontal: INSTITUTIONAL_CARD_INSET.horizontal,
    paddingVertical: INSTITUTIONAL_CARD_INSET.vertical,
  } satisfies ViewStyle,
  listRowSelected: {
    backgroundColor: I.canvas,
    borderColor: I.primary,
  } satisfies ViewStyle,
  /** Placa de ícono — reposo */
  iconPlate: {
    width: 28,
    height: 28,
    borderRadius: BORDERS.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  } satisfies ViewStyle,
  iconPlateSelected: {
    backgroundColor: withOpacity(I.primary, 0.1),
    borderColor: withOpacity(I.primary, 0.35),
  } satisfies ViewStyle,
  title: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  } satisfies TextStyle,
  titleSelected: {
    color: I.primary,
  } satisfies TextStyle,
  description: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginTop: SPACING.fixed.xxs,
  } satisfies TextStyle,
  checkbox: {
    position: 'absolute',
    top: SPACING.fixed.xxs + 2,
    right: SPACING.fixed.xxs + 2,
    width: 20,
    height: 20,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    justifyContent: 'center',
    alignItems: 'center',
  } satisfies ViewStyle,
  checkboxSelected: {
    borderColor: I.primary,
    backgroundColor: I.primary,
  } satisfies ViewStyle,
  /** Toggle de dos opciones (tipo servicio con/sin repuestos) */
  toggleOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
  } satisfies ViewStyle,
  toggleOptionSelected: {
    borderColor: I.primary,
    borderWidth: BORDERS.width.medium,
    backgroundColor: I.canvas,
  } satisfies ViewStyle,
} as const;

export const institutionalSelectionStyles = StyleSheet.create({
  ...INSTITUTIONAL_SELECTION,
});

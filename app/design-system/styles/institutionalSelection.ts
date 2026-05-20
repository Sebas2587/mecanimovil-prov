/**
 * Patrones de selección — DESIGN_PROVEEDORES_INSTITUCIONAL (adaptación RN).
 * Ítem seleccionado: fondo canvas (blanco), borde primario; sin surfaceStrong ni primary[50] de relleno.
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '../tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export const INSTITUTIONAL_SELECTION = {
  /** Tarjeta / fila en reposo */
  card: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  } satisfies ViewStyle,
  /** Tarjeta / fila seleccionada — contraste por borde, no fondo gris */
  cardSelected: {
    backgroundColor: I.canvas,
    borderColor: I.primary,
    borderWidth: BORDERS.width.medium,
  } satisfies ViewStyle,
  /** Fila lista (servicios ofrecidos, etc.) */
  listRow: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.md,
  } satisfies ViewStyle,
  listRowSelected: {
    backgroundColor: I.canvas,
    borderColor: I.primary,
    borderWidth: BORDERS.width.medium,
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

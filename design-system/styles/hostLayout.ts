/**
 * Layout Host (Airbnb Anfitriones): un solo gutter horizontal, columna stretch.
 * Usar en ScrollView contentContainerStyle — no en style (evita padding doble en web).
 */
import { StyleSheet, type ViewStyle } from 'react-native';
import { SPACING } from '../tokens';

/** Gutter de pantalla (= `SPACING.container.horizontal`). */
export const HOST_GUTTER = SPACING.container.horizontal;

export const hostScreenStyles = StyleSheet.create({
  /** `style` del ScrollView / contenedor flex. */
  scroll: {
    flex: 1,
  } satisfies ViewStyle,
  /**
   * `contentContainerStyle` del ScrollView.
   * Un único inset horizontal; hijos a ancho completo de la columna.
   */
  scrollInner: {
    paddingHorizontal: HOST_GUTTER,
    paddingTop: SPACING.xs,
    alignItems: 'stretch',
    width: '100%',
  } satisfies ViewStyle,
  /** Bloque / card que debe ocupar el ancho útil. */
  stretch: {
    alignSelf: 'stretch',
    width: '100%',
  } satisfies ViewStyle,
  /** Contenedor de tabs / header alineado al mismo gutter. */
  gutterX: {
    paddingHorizontal: HOST_GUTTER,
  } satisfies ViewStyle,
});

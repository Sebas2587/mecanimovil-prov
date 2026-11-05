import type { ViewStyle } from 'react-native';

/**
 * El marco de la lista termina donde empieza el control medido.
 * `reservaMedida` sale del layout real del botón, no de un alto fijo.
 * No es padding del contenido: achica la caja del scroll.
 */
export function marcoListaStyle(reservaMedida: number): ViewStyle {
  if (reservaMedida <= 0) return { flex: 1 };
  return { flex: 1, marginBottom: reservaMedida };
}

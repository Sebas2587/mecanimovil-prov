import type { ViewStyle } from 'react-native';
import { useTallerShell } from '@/components/navigation/TallerShellContext';

/**
 * El marco de la lista termina donde empieza el control medido.
 * `reservaMedida` sale del layout real del botón, no de un alto fijo.
 * No es padding del contenido: achica la caja del scroll.
 */
export function marcoListaStyle(reservaMedida: number): ViewStyle {
  if (reservaMedida <= 0) return { flex: 1 };
  return { flex: 1, marginBottom: reservaMedida };
}

/** Reserva medida del FAB de nueva cotización, si está visible. */
export function useMarcoListaStyle(): ViewStyle {
  const { reservaLista, accionFlotante } = useTallerShell();
  const reserva = reservaLista > 0 ? reservaLista : (accionFlotante ? 64 : 0);
  return marcoListaStyle(reserva);
}

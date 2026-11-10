import { Platform, type ViewStyle } from 'react-native';

/** Ancho cómodo en web para revisar una cotización. */
export const COTIZACION_DIALOGO_ANCHO = 800;

const WEB = Platform.OS === 'web';

/** Diálogo de cotización en web: ~800 px y hasta 90vh. */
export const cotizacionDialogoWeb = (WEB
  ? {
      width: '100%',
      maxWidth: COTIZACION_DIALOGO_ANCHO,
      height: '90vh',
      maxHeight: '90vh',
      minHeight: 0,
      alignSelf: 'center',
    }
  : {}) as ViewStyle;

/** Hoja casi a pantalla completa en mobile. */
export const cotizacionDialogoMovil = (WEB
  ? {}
  : {
      width: '100%',
      maxHeight: '96%',
      height: '96%',
      minHeight: 0,
    }) as ViewStyle;

/** En viewports angostos de web, hoja a pantalla casi completa (cubre FAB y tabs). */
export function estiloCotizacionDialogo(width: number): ViewStyle {
  if (!WEB) return cotizacionDialogoMovil;
  if (width < 720) {
    return {
      width: '100%',
      maxWidth: '100%',
      height: '100%',
      maxHeight: '100%',
      minHeight: 0,
      alignSelf: 'stretch',
    } as ViewStyle;
  }
  return cotizacionDialogoWeb;
}

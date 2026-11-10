import { Platform, type ViewStyle } from 'react-native';
import { COLORS } from '@/app/design-system/tokens';

/** Ancho cómodo en web para revisar una cotización. */
export const COTIZACION_DIALOGO_ANCHO = 800;

/** Por encima de tabs (40), FABs (30–60), alertas (1000) y snackbar (9999). */
export const COTIZACION_DIALOGO_Z = 100000;

const WEB = Platform.OS === 'web';
const PAPEL = COLORS.background.paper;
const FONDO = COLORS.background.glassDark;

function inyectarApiladoModalWeb() {
  if (!WEB || typeof document === 'undefined') return;
  const id = 'mm-cotizacion-dialogo-stack';
  const prev = document.getElementById(id);
  if (prev) prev.remove();
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    /* El paper de RN-web deja ver el dashboard por el compositor.
       #root se oculta solo visualmente: toasts salen a document.body. */
    body:has([aria-modal="true"]) #root {
      isolation: isolate;
      z-index: 0;
      visibility: hidden;
    }
    body > div:has([aria-modal="true"]) {
      position: fixed !important;
      inset: 0 !important;
      z-index: ${COTIZACION_DIALOGO_Z} !important;
      background-color: ${FONDO} !important;
    }
    [aria-modal="true"] {
      z-index: ${COTIZACION_DIALOGO_Z} !important;
      background-color: ${FONDO} !important;
    }
    [data-testid="cotizacion-dialogo"] {
      background-color: ${PAPEL} !important;
      background-image: linear-gradient(${PAPEL}, ${PAPEL}) !important;
      isolation: isolate;
      opacity: 1 !important;
    }
    [data-testid="cotizacion-dialogo-fondo"] {
      background-color: ${FONDO} !important;
    }
    /* Avisos visibles con el modal, nunca encima del footer de acciones. */
    body:has([aria-modal="true"]) [data-testid="host-snackbar"] {
      top: 12px !important;
      bottom: auto !important;
      transform: none !important;
    }
    body:has([aria-modal="true"]) [data-testid="alerta-flotante-taller"] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

inyectarApiladoModalWeb();

/** Capa a pantalla completa: backdrop oscuro semitransparente, encima del chrome. */
export const cotizacionDialogoCapa = {
  ...(WEB
    ? {
        position: 'fixed' as const,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: COTIZACION_DIALOGO_Z,
      }
    : {
        flex: 1,
      }),
  width: '100%',
  height: '100%',
  backgroundColor: FONDO,
} as ViewStyle;

/** Superficie opaca del diálogo (nunca transparente). */
export const cotizacionDialogoSuperficie = {
  backgroundColor: PAPEL,
  opacity: 1,
  ...(WEB ? { isolation: 'isolate' as const } : null),
} as ViewStyle;

/** Diálogo de cotización en web: ~800 px y hasta 90vh. */
export const cotizacionDialogoWeb = (WEB
  ? {
      width: '100%',
      maxWidth: COTIZACION_DIALOGO_ANCHO,
      height: '90vh',
      maxHeight: '90vh',
      minHeight: 0,
      alignSelf: 'center',
      backgroundColor: PAPEL,
    }
  : { backgroundColor: PAPEL }) as ViewStyle;

/** Hoja casi a pantalla completa en mobile. */
export const cotizacionDialogoMovil = {
  width: '100%',
  maxHeight: '96%',
  height: '96%',
  minHeight: 0,
  backgroundColor: PAPEL,
} as ViewStyle;

/** En viewports angostos de web, hoja a pantalla completa (cubre FAB y tabs). */
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
      borderRadius: 0,
      backgroundColor: PAPEL,
    } as ViewStyle;
  }
  return cotizacionDialogoWeb;
}

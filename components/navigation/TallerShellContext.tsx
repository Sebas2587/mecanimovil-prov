import { createContext, useContext } from 'react';

type TallerShellValue = {
  /** El cromado del shell ya reservó el notch. Las pantallas no lo suman otra vez. */
  ocupaTope: boolean;
  /** Hay un botón flotante sobre la barra inferior. */
  accionFlotante: boolean;
  /** Abre el formulario de cotización encima de la pantalla actual. */
  abrirNuevaCotizacion: () => void;
};

const VACIO: TallerShellValue = {
  ocupaTope: false,
  accionFlotante: false,
  abrirNuevaCotizacion: () => {},
};

export const TallerShellContext = createContext<TallerShellValue>(VACIO);

export function useTallerShell() {
  return useContext(TallerShellContext);
}

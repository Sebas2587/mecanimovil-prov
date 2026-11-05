import { createContext, useContext } from 'react';

type TallerShellValue = {
  /** El cromado del shell ya reservó el notch. Las pantallas no lo suman otra vez. */
  ocupaTope: boolean;
  /** Hay un botón flotante sobre la barra inferior. */
  accionFlotante: boolean;
  /**
   * Alto medido del control, incluido su aire sobre la barra.
   * La lista lo usa como margen del marco, no como padding del scroll.
   */
  reservaLista: number;
  fijarReservaLista: (alto: number) => void;
  /** Abre el formulario de cotización encima de la pantalla actual. */
  abrirNuevaCotizacion: () => void;
};

const VACIO: TallerShellValue = {
  ocupaTope: false,
  accionFlotante: false,
  reservaLista: 0,
  fijarReservaLista: () => {},
  abrirNuevaCotizacion: () => {},
};

export const TallerShellContext = createContext<TallerShellValue>(VACIO);

export function useTallerShell() {
  return useContext(TallerShellContext);
}

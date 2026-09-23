import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

type Frame = {
  /** Parte inferior tapada por el teclado o la barra del navegador. */
  obscuredBottom: number;
  touch: boolean;
};

const IDLE: Frame = { obscuredBottom: 0, touch: false };

/**
 * Alto visible real en el navegador móvil (barra del sistema y teclado).
 * En nativo no aplica: el sistema ya recorta la ventana.
 */
export function useWebVisualViewport(): Frame {
  const [frame, setFrame] = useState<Frame>(IDLE);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const read = () => {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const obscuredBottom = Math.max(0, Math.round(window.innerHeight - height - offsetTop));
      const touch = window.matchMedia('(pointer: coarse)').matches;
      setFrame((prev) =>
        prev.obscuredBottom === obscuredBottom && prev.touch === touch
          ? prev
          : { obscuredBottom, touch },
      );
    };

    read();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', read);
    vv?.addEventListener('scroll', read);
    window.addEventListener('resize', read);
    window.addEventListener('orientationchange', read);
    return () => {
      vv?.removeEventListener('resize', read);
      vv?.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
      window.removeEventListener('orientationchange', read);
    };
  }, []);

  return Platform.OS === 'web' ? frame : IDLE;
}

/**
 * Aire bajo los botones. En Android/iOS web el inset seguro suele venir en 0
 * y la barra de gestos o el teclado tapan el pie.
 * No cambia la altura de la pantalla: un `flex: 0` con alto fijo la colapsaba a 0.
 */
export function webFooterBottom(frame: Frame, insetBottom: number, min: number): number {
  const floor = frame.touch ? 36 : min;
  return Math.max(insetBottom, min, floor) + frame.obscuredBottom;
}

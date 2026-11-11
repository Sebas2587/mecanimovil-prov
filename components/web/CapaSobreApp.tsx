import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/** Por encima del diálogo (100000). Con modal abierto van arriba, nunca sobre el footer. */
export const TOASTS_Z = 200000;

type PortalFn = (children: React.ReactNode, container: Element) => React.ReactPortal;

let createPortal: PortalFn | null = null;
if (Platform.OS === 'web') {
  try {
    createPortal = require('react-dom').createPortal as PortalFn;
  } catch {
    createPortal = null;
  }
}

/** RN-web Modal pone `aria-modal="true"` en el portal del body. */
export function useModalAriaAbierto(): boolean {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const sync = () => setAbierto(Boolean(document.querySelector('[aria-modal="true"]')));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-modal'],
    });
    return () => obs.disconnect();
  }, []);
  return abierto;
}

/**
 * Pinta toasts en el body para que se vean con el modal abierto.
 * El chrome (tabs, banner, FAB) sigue en #root, debajo del backdrop.
 * pointerEvents box-none: la capa no intercepta taps; los hijos sí.
 */
export function CapaSobreApp({ children }: { children: React.ReactNode }) {
  const capa = (
    <View pointerEvents="box-none" style={Platform.OS === 'web' ? styles.web : styles.nativo}>
      {children}
    </View>
  );
  if (Platform.OS === 'web' && createPortal && typeof document !== 'undefined') {
    return createPortal(capa, document.body);
  }
  return capa;
}

const styles = StyleSheet.create({
  web: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: TOASTS_Z,
  },
  nativo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: TOASTS_Z,
  },
});

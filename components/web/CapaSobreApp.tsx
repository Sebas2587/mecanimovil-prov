import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/** Por encima del diálogo de cotización (100000) y del chrome. */
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

/**
 * Pinta toasts y alertas en el body, encima del modal.
 * El chrome de la app (tabs, banner, FAB) sigue en #root, debajo del backdrop.
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

/**
 * Logs de depuración: solo cuando __DEV__ es true (Expo / React Native).
 * No ejecuta en producción: menos ruido, menos serialización y menos datos sensibles en consola.
 */
export function devLog(...args: unknown[]): void {
  if (__DEV__) {
    logger.log(...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (__DEV__) {
    logger.warn(...args);
  }
}

/**
 * Logs de depuración: solo cuando __DEV__ es true (Expo / React Native).
 * No ejecuta en producción: menos ruido, menos serialización y menos datos sensibles en consola.
 */
export function devLog(...args: unknown[]): void {
  if (__DEV__) {
    console.log(...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (__DEV__) {
    console.warn(...args);
  }
}

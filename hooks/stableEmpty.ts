const EMPTY_LIST: readonly never[] = [];
const EMPTY_MAP = new Map<never, never>();
const EMPTY_RECORD: Readonly<Record<string, never>> = {};

/** Misma referencia en cada render. No mutar. */
export function emptyList<T>(): T[] {
  return EMPTY_LIST as unknown as T[];
}

/** Misma referencia en cada render. No mutar. */
export function emptyMap<K, V>(): Map<K, V> {
  return EMPTY_MAP as unknown as Map<K, V>;
}

/** Misma referencia en cada render. No mutar. */
export function emptyRecord<T extends object>(): T {
  return EMPTY_RECORD as T;
}

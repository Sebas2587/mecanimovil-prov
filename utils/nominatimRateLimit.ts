/** Espaciado mínimo entre llamadas a api.openstreetmap.org (política de uso). */
const MIN_INTERVAL_MS = 1100;

let lastCompleteAt = 0;

export async function waitNominatimSlot(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastCompleteAt));
  if (wait > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, wait));
  }
}

export function markNominatimComplete(): void {
  lastCompleteAt = Date.now();
}

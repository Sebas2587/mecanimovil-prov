/**
 * Búsqueda de direcciones en Chile vía Nominatim (OpenStreetMap).
 * Requiere User-Agent identificable según política de uso.
 */

import { markNominatimComplete, waitNominatimSlot } from '@/utils/nominatimRateLimit';

export type ChileAddressHit = {
  display_name: string;
  lat: number;
  lon: number;
};

const UA = 'MecaniMovil-Proveedores/1.0';

export async function searchChileAddresses(
  query: string,
  opts?: { limit?: number; signal?: AbortSignal }
): Promise<ChileAddressHit[]> {
  const q = query.trim();
  if (q.length < 4) return [];

  const limit = opts?.limit ?? 8;
  const url =
    `https://nominatim.openstreetmap.org/search?format=json` +
    `&q=${encodeURIComponent(`${q}, Chile`)}` +
    `&countrycodes=cl&limit=${limit}&addressdetails=1&accept-language=es`;

  await waitNominatimSlot();
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: opts?.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ display_name?: string; lat?: string; lon?: string; address?: { country?: string } }>;
    if (!Array.isArray(data)) return [];

    return data
      .filter((item) => item.address?.country === 'Chile' && item.lat && item.lon)
      .map((item) => ({
        display_name: String(item.display_name || ''),
        lat: parseFloat(item.lat as string),
        lon: parseFloat(item.lon as string),
      }))
      .filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lon));
  } finally {
    markNominatimComplete();
  }
}

/**
 * Búsqueda y normalización de direcciones en Chile (Nominatim / OSM).
 * Misma lógica que gestionar-taller y actualizar-ubicacion; usable en onboarding.
 */
import { markNominatimComplete, waitNominatimSlot } from '@/utils/nominatimRateLimit';

const UA = 'MecaniMovil-Proveedores/1.0';

export const CHILE_ADDRESS_MIN_QUERY = 8;

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; code?: string; message?: string };
  return (
    e.name === 'AbortError' ||
    e.code === 'ABORT_ERR' ||
    (typeof e.message === 'string' &&
      (e.message.includes('aborted') || e.message.includes('Abort')))
  );
}

export type ChileAddressParts = {
  road?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  district?: string;
};

export type ChileAddressHitDetailed = {
  display_name: string;
  lat: number;
  lon: number;
  address: ChileAddressParts;
};

export type ChileFormattedAddress = {
  /** Texto guardado en backend (calle número, comuna, ciudad, Chile) */
  line: string;
  comuna: string;
  ciudad: string;
  region: string;
  lat: number;
  lon: number;
  display_name: string;
};

type NominatimRaw = {
  display_name?: string;
  lat?: string;
  lon?: string;
  addresstype?: string;
  class?: string;
  address?: ChileAddressParts & { country?: string };
};

/** Requiere al menos 8 caracteres y un número (calle con numeración). */
export function isPlausibleChileAddressQuery(query: string): boolean {
  const q = query.trim();
  return q.length >= CHILE_ADDRESS_MIN_QUERY && /\d+/.test(q);
}

function filterValidChileItem(item: NominatimRaw): boolean {
  const { address, addresstype, class: itemClass } = item;
  if (!address || address.country !== 'Chile') return false;

  const tieneUbicacion = address.city || address.state || address.suburb || address.neighbourhood;
  if (!tieneUbicacion) return false;

  if (address.road) return true;
  if (addresstype === 'suburb' || addresstype === 'neighbourhood') return true;
  if (itemClass === 'boundary' && (address.suburb || address.neighbourhood)) return true;
  if (addresstype === 'place' && (address.suburb || address.neighbourhood)) return true;

  return false;
}

function enrichHit(item: NominatimRaw, query: string): ChileAddressHitDetailed {
  const numeroExtraido = query.match(/\d+/)?.[0] || '';
  const addr = item.address ?? {};
  return {
    display_name: String(item.display_name || ''),
    lat: parseFloat(String(item.lat)),
    lon: parseFloat(String(item.lon)),
    address: {
      ...addr,
      house_number: numeroExtraido || addr.house_number || '',
      road: addr.road || addr.suburb || addr.neighbourhood || '',
    },
  };
}

async function fetchNominatim(q: string, limit: number, signal?: AbortSignal): Promise<NominatimRaw[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json` +
    `&q=${encodeURIComponent(`${q}, Chile`)}` +
    `&countrycodes=cl&limit=${limit}&addressdetails=1&accept-language=es`;

  if (signal?.aborted) return [];

  await waitNominatimSlot();

  if (signal?.aborted) return [];

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimRaw[];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) return [];
    throw error;
  } finally {
    markNominatimComplete();
  }
}

async function searchRaw(query: string, limit: number, signal?: AbortSignal): Promise<ChileAddressHitDetailed[]> {
  const data = await fetchNominatim(query, limit, signal);
  return data
    .filter(filterValidChileItem)
    .map((item) => enrichHit(item, query))
    .filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lon));
}

/** Búsqueda por calle + número y por comuna/barrio (enriquece con el número del query). */
export async function searchChileAddressesDetailed(
  query: string,
  opts?: { limit?: number; signal?: AbortSignal }
): Promise<ChileAddressHitDetailed[]> {
  const q = query.trim();
  if (!isPlausibleChileAddressQuery(q)) return [];

  const limit = opts?.limit ?? 10;
  const signal = opts?.signal;

  let resultadosDireccion: ChileAddressHitDetailed[] = [];
  try {
    resultadosDireccion = await searchRaw(q, limit, signal);
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) return [];
    throw error;
  }
  if (signal?.aborted) return [];

  const numero = q.match(/\d+/)?.[0] || '';
  const textoLimpio = q.replace(/\d+/g, '').trim();

  let resultadosComuna: ChileAddressHitDetailed[] = [];
  if (textoLimpio.length >= 3) {
    let data: NominatimRaw[] = [];
    try {
      data = await fetchNominatim(textoLimpio, 5, signal);
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) return resultadosDireccion;
      throw error;
    }
    if (!signal?.aborted) {
      resultadosComuna = data
        .filter((item) => {
          const { address, addresstype, class: itemClass } = item;
          if (!address || address.country !== 'Chile') return false;
          return (
            addresstype === 'suburb' ||
            addresstype === 'neighbourhood' ||
            addresstype === 'place' ||
            (itemClass === 'boundary' && (address.suburb || address.neighbourhood))
          );
        })
        .map((item) => {
          const addr = item.address ?? {};
          return enrichHit(
            {
              ...item,
              address: {
                ...addr,
                house_number: numero,
                road: addr.suburb || addr.neighbourhood || addr.road || '',
              },
            },
            q
          );
        })
        .filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lon));
    }
  }

  const merged = [...resultadosDireccion, ...resultadosComuna];
  return merged.filter(
    (item, index, self) => index === self.findIndex((t) => t.display_name === item.display_name)
  );
}

export function extractComunaFromParts(address: ChileAddressParts): string {
  return (address.suburb || address.neighbourhood || address.city || '').trim();
}

export function extractRegionFromParts(address: ChileAddressParts): string {
  return (address.state || '').trim();
}

/** Dirección con comuna y región administrativa resueltas en Chile. */
export function isStructuredChileAddressComplete(address: ChileAddressParts): boolean {
  const comuna = extractComunaFromParts(address);
  const region = extractRegionFromParts(address);
  const calle =
    (address.road && address.road !== comuna ? address.road : '') ||
    address.suburb ||
    address.neighbourhood ||
    '';
  return Boolean(comuna && region && calle);
}

/** Formato alineado a gestionar-taller / app usuarios. */
export function formatChileAddressFromHit(
  hit: ChileAddressHitDetailed,
  query?: string
): ChileFormattedAddress {
  const { address } = hit;
  const numeroCasa = address.house_number || query?.match(/\d+/)?.[0] || '';

  let calle = '';
  if (address.road && address.road !== address.suburb && address.road !== address.neighbourhood) {
    calle = address.road;
  } else if (address.suburb) {
    calle = address.suburb;
  } else if (address.neighbourhood) {
    calle = address.neighbourhood;
  }

  const comuna = extractComunaFromParts(address);
  const ciudad = (address.city || address.state || '').trim();
  const region = extractRegionFromParts(address);

  const direccionCompleta = `${calle} ${numeroCasa}`.trim();
  const line = `${direccionCompleta}, ${comuna}, ${ciudad}, Chile`
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '');

  return {
    line,
    comuna,
    ciudad,
    region,
    lat: hit.lat,
    lon: hit.lon,
    display_name: hit.display_name,
  };
}

export function formatHitForSuggestion(hit: ChileAddressHitDetailed): {
  mainText: string;
  secondaryText: string;
} {
  const comuna = extractComunaFromParts(hit.address);
  const region = extractRegionFromParts(hit.address);
  const parts = [comuna, region].filter(Boolean);
  return {
    mainText: hit.display_name.replace(/, Chile$/i, '').trim(),
    secondaryText: parts.length ? parts.join(' · ') : 'Chile',
  };
}

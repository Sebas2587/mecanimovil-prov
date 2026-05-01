/**
 * Geocodificación inversa para la app proveedores.
 * - Usa siempre las coordenadas reales del GPS (no sustituir por Santiago: eso generaba direcciones falsas).
 * - Prioriza Nominatim (OSM): en Chile suele acertar mejor calle/comuna que el reverse nativo de Expo.
 * - Expo solo como respaldo si Nominatim falla.
 * - Política Nominatim: máx. ~1 req/s; User-Agent identificable.
 */

import * as Location from 'expo-location';
import { markNominatimComplete, waitNominatimSlot } from '@/utils/nominatimRateLimit';

const UA = 'MecaniMovil-Proveedores/1.0';

export type ReverseGeocodeHit = {
  street?: string | null;
  streetNumber?: string | null;
  district?: string | null;
  city?: string | null;
  region?: string | null;
  /** Una línea lista para mostrar / enviar al backend */
  formattedLine: string;
};

type NominatimStructured = Omit<ReverseGeocodeHit, 'formattedLine'> & {
  displayName?: string | null;
};

function isChileAddress(addr: Record<string, unknown>): boolean {
  const cc = (addr.country_code as string | undefined)?.toLowerCase();
  const country = (addr.country as string | undefined)?.toLowerCase();
  return cc === 'cl' || country === 'chile';
}

async function reverseGeocodeWithNominatim(
  latitude: number,
  longitude: number
): Promise<NominatimStructured | null> {
  await waitNominatimSlot();
  try {
    const reverseUrl =
      `https://nominatim.openstreetmap.org/reverse?` +
      `lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=es&zoom=18`;

    const response = await fetch(reverseUrl, {
      headers: { 'User-Agent': UA },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      address?: Record<string, unknown>;
      display_name?: string;
      error?: string;
    };
    if (data.error || !data.address) return null;
    const addr = data.address;
    if (!isChileAddress(addr)) return null;

    const street =
      (addr.road as string) ||
      (addr.pedestrian as string) ||
      (addr.path as string) ||
      (addr.footway as string) ||
      (addr.residential as string) ||
      (addr.street as string) ||
      null;

    const streetNumber = (addr.house_number as string) || (addr.house as string) || null;

    const district =
      (addr.suburb as string) ||
      (addr.neighbourhood as string) ||
      (addr.city_district as string) ||
      (addr.quarter as string) ||
      (addr.borough as string) ||
      null;

    const city =
      (addr.city as string) ||
      (addr.town as string) ||
      (addr.municipality as string) ||
      (addr.county as string) ||
      (addr.village as string) ||
      (addr.hamlet as string) ||
      null;

    const region = (addr.state as string) || (addr.region as string) || null;

    return {
      street,
      streetNumber,
      district,
      city,
      region,
      displayName: typeof data.display_name === 'string' ? data.display_name : null,
    };
  } catch {
    return null;
  } finally {
    markNominatimComplete();
  }
}

function formatStructured(hit: Omit<ReverseGeocodeHit, 'formattedLine'>): string {
  const parts: string[] = [];
  if (hit.street) {
    parts.push(`${hit.street} ${hit.streetNumber || ''}`.trim());
  }
  if (hit.district) parts.push(hit.district);
  if (hit.city && hit.city !== hit.district) parts.push(hit.city);
  if (hit.region && hit.region !== hit.city && hit.region !== hit.district) {
    parts.push(hit.region);
  }
  return parts.filter(Boolean).join(', ');
}

function finalizeLine(
  structured: string,
  displayName: string | null | undefined,
  lat: number,
  lng: number
): string {
  const s = structured.trim();
  if (s.length > 0) return s;
  if (displayName && displayName.trim()) return displayName.trim();
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function expoToStructured(expo: Location.LocationGeocodedAddress): Omit<ReverseGeocodeHit, 'formattedLine'> {
  return {
    street: expo.street || expo.name || null,
    streetNumber: expo.streetNumber || null,
    district: expo.district || expo.subregion || null,
    city: expo.city || null,
    region: expo.region || null,
  };
}

/**
 * Geocodificación inversa: coordenadas reales, Nominatim primero (Chile), Expo de respaldo.
 */
export async function reverseGeocodeProveedor(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeHit> {
  const lat = latitude;
  const lng = longitude;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { formattedLine: 'Coordenadas no válidas' };
  }

  const nom = await reverseGeocodeWithNominatim(lat, lng);
  if (nom) {
    const structured = formatStructured(nom);
    return {
      street: nom.street,
      streetNumber: nom.streetNumber,
      district: nom.district,
      city: nom.city,
      region: nom.region,
      formattedLine: finalizeLine(structured, nom.displayName, lat, lng),
    };
  }

  let expoResult: Location.LocationGeocodedAddress | null = null;
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const chile = results.filter((r) => r.isoCountryCode === 'CL' || r.country === 'Chile');
    if (chile.length > 0) expoResult = chile[0];
  } catch {
    expoResult = null;
  }

  if (expoResult) {
    const hit = expoToStructured(expoResult);
    const line = formatStructured(hit);
    return {
      ...hit,
      formattedLine: finalizeLine(line, null, lat, lng),
    };
  }

  return {
    formattedLine: finalizeLine('', null, lat, lng),
  };
}

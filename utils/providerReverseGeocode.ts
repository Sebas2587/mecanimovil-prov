/**
 * Misma idea que mecanimovil-usuarios/app/services/location.js (reverseGeocode):
 * Expo reverseGeocodeAsync primero; si falta número de calle o falla → Nominatim reverse.
 * Sin direcciones aleatorias de fallback (proveedor debe tener punto real).
 */

import * as Location from 'expo-location';

export type ReverseGeocodeHit = {
  street?: string | null;
  streetNumber?: string | null;
  district?: string | null;
  city?: string | null;
  region?: string | null;
  /** Una línea lista para mostrar / enviar al backend */
  formattedLine: string;
};

function isLocationInChile(latitude: number, longitude: number): boolean {
  return (
    latitude <= -17.5 &&
    latitude >= -56 &&
    longitude <= -66 &&
    longitude >= -80
  );
}

async function reverseGeocodeWithNominatim(
  latitude: number,
  longitude: number
): Promise<Omit<ReverseGeocodeHit, 'formattedLine'> | null> {
  try {
    const reverseUrl =
      `https://nominatim.openstreetmap.org/reverse?` +
      `lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=es&zoom=18`;

    const response = await fetch(reverseUrl, {
      headers: { 'User-Agent': 'MecaniMovilProveedor/1.0' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.address) return null;

    const addr = data.address;
    return {
      street: addr.road || addr.pedestrian || addr.path || addr.street || null,
      streetNumber: addr.house_number || addr.house || null,
      district:
        addr.suburb || addr.city_district || addr.borough || addr.neighbourhood || null,
      city: addr.city || addr.town || addr.municipality || null,
      region: addr.state || addr.region || null,
    };
  } catch {
    return null;
  }
}

function formatLikeUserApp(hit: Omit<ReverseGeocodeHit, 'formattedLine'>): string {
  const parts: string[] = [];
  if (hit.street) {
    parts.push(`${hit.street} ${hit.streetNumber || ''}`.trim());
  }
  if (hit.district) parts.push(hit.district);
  if (hit.city && hit.city !== hit.district) parts.push(hit.city);
  return parts.filter(Boolean).join(', ');
}

function hasStreetNumber(expo: Location.LocationGeocodedAddress): boolean {
  return !!(
    expo.streetNumber ||
    (expo as { number?: string }).number ||
    (expo as { houseNumber?: string }).houseNumber ||
    (expo.name && /\d+/.test(String(expo.name)))
  );
}

/**
 * Geocodificación inversa alineada con la app usuarios (location.js).
 */
export async function reverseGeocodeProveedor(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeHit> {
  let lat = latitude;
  let lng = longitude;

  if (!isLocationInChile(lat, lng)) {
    lat = -33.4489;
    lng = -70.6693;
  }

  let expoResult: Location.LocationGeocodedAddress | null = null;
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const chile = results.filter(
      (r) => r.isoCountryCode === 'CL' || r.country === 'Chile'
    );
    if (chile.length > 0) expoResult = chile[0];
  } catch {
    expoResult = null;
  }

  let nominatim: Omit<ReverseGeocodeHit, 'formattedLine'> | null = null;
  const expoOkNumber = expoResult && hasStreetNumber(expoResult);

  if (!expoOkNumber || !expoResult) {
    nominatim = await reverseGeocodeWithNominatim(lat, lng);
    if (
      nominatim &&
      (nominatim.streetNumber || nominatim.street) &&
      (!expoResult || !expoOkNumber)
    ) {
      const line = formatLikeUserApp(nominatim);
      return {
        ...nominatim,
        formattedLine: line || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      };
    }
  }

  if (expoResult) {
    const hit: Omit<ReverseGeocodeHit, 'formattedLine'> = {
      street: expoResult.street || expoResult.name || null,
      streetNumber: expoResult.streetNumber || null,
      district: expoResult.district || expoResult.subregion || null,
      city: expoResult.city || null,
      region: expoResult.region || null,
    };
    const line = formatLikeUserApp(hit);
    return {
      ...hit,
      formattedLine: line || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    };
  }

  if (nominatim) {
    const line = formatLikeUserApp(nominatim);
    return {
      ...nominatim,
      formattedLine: line || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    };
  }

  return {
    formattedLine: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}

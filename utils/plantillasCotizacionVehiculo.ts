import type { CotizacionPlantilla } from '@/services/cotizacionCanalService';

export interface VehiculoPlantillaFiltro {
  marca: string;
  modelo: string;
  cilindraje?: string;
}

function normTexto(valor: string | null | undefined): string {
  return String(valor ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function normCilindraje(valor: string | null | undefined): string {
  const digits = String(valor ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/^0+/, '') || digits;
}

export function plantillaCoincideVehiculo(
  snapshot: Record<string, unknown> | null | undefined,
  vehiculo: VehiculoPlantillaFiltro,
): boolean {
  const snap = snapshot ?? {};
  const snapMarca = normTexto(String(snap.vehiculo_marca ?? ''));
  const snapModelo = normTexto(String(snap.vehiculo_modelo ?? ''));
  if (!snapMarca || !snapModelo) return false;

  const marca = normTexto(vehiculo.marca);
  const modelo = normTexto(vehiculo.modelo);
  if (!marca || !modelo) return false;
  if (marca !== snapMarca) return false;

  if (modelo !== snapModelo && !snapModelo.includes(modelo) && !modelo.includes(snapModelo)) {
    return false;
  }

  const snapCil = normCilindraje(String(snap.vehiculo_cilindraje ?? ''));
  const cil = normCilindraje(vehiculo.cilindraje ?? '');
  if (snapCil && cil && snapCil !== cil) return false;

  return true;
}

export function filtrarPlantillasPorVehiculo(
  plantillas: CotizacionPlantilla[],
  vehiculo: VehiculoPlantillaFiltro,
): CotizacionPlantilla[] {
  if (!vehiculo.marca.trim() || !vehiculo.modelo.trim()) return [];
  return plantillas.filter((p) => plantillaCoincideVehiculo(p.snapshot, vehiculo));
}

export function resumenVehiculoPlantilla(snapshot: Record<string, unknown> | null | undefined): string {
  const snap = snapshot ?? {};
  const partes = [
    String(snap.vehiculo_marca ?? '').trim(),
    String(snap.vehiculo_modelo ?? '').trim(),
    String(snap.vehiculo_cilindraje ?? '').trim(),
  ].filter(Boolean);
  return partes.join(' · ');
}

export function etiquetaVehiculoActual(vehiculo: VehiculoPlantillaFiltro): string {
  const partes = [vehiculo.marca.trim(), vehiculo.modelo.trim(), vehiculo.cilindraje?.trim()].filter(
    Boolean,
  );
  return partes.join(' · ');
}

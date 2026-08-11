import type {
  CotizacionCanal,
  CotizacionPlantilla,
  RepuestoCotizacion,
} from '@/services/cotizacionCanalService';
import { redondearCLP } from '@/utils/formatearMontoCLP';
import { resumenVehiculoPlantilla } from '@/utils/plantillasCotizacionVehiculo';

function snapStr(snap: Record<string, unknown>, key: string): string {
  const v = snap[key];
  if (v == null) return '';
  return String(v).trim();
}

function snapNum(snap: Record<string, unknown>, key: string): number {
  const n = Number(snap[key] ?? 0);
  return Number.isFinite(n) ? redondearCLP(n) : 0;
}

/** Título legible del servicio (sin prefijo Auto: del aprendizaje). */
export function tituloServicioPlantilla(p: CotizacionPlantilla): string {
  const snap = p.snapshot ?? {};
  const raw =
    snapStr(snap, 'servicio_nombre')
    || p.servicio_nombre
    || p.titulo
    || 'Plantilla';
  return raw.replace(/^Auto:\s*[^—]+—\s*/i, '').trim() || raw;
}

export function vehiculoLineaPlantilla(p: CotizacionPlantilla): string {
  const snap = p.snapshot ?? {};
  return (
    resumenVehiculoPlantilla(snap)
    || [p.vehiculo_marca, p.vehiculo_modelo, p.vehiculo_cilindraje].filter(Boolean).join(' · ')
  );
}

export function totalPlantilla(p: CotizacionPlantilla): number {
  const snap = p.snapshot ?? {};
  const total = snapNum(snap, 'total_clp');
  if (total > 0) return total;
  const reps = Array.isArray(snap.repuestos) ? (snap.repuestos as RepuestoCotizacion[]) : [];
  const repSum = reps.reduce(
    (acc, r) => acc + redondearCLP(r.cantidad || 1) * redondearCLP(r.precio_unitario_clp || 0),
    0,
  );
  return repSum + snapNum(snap, 'mano_obra_clp');
}

export function repuestosCountPlantilla(p: CotizacionPlantilla): number {
  const reps = (p.snapshot?.repuestos ?? []) as unknown[];
  return Array.isArray(reps) ? reps.length : 0;
}

/** Vista previa readonly compatible con CotizacionIaEditor. */
export function plantillaToCotizacionPreview(plantilla: CotizacionPlantilla): CotizacionCanal {
  const snap = plantilla.snapshot ?? {};
  const repuestos = (
    Array.isArray(snap.repuestos) ? snap.repuestos : []
  ) as RepuestoCotizacion[];
  const anioRaw = snap.vehiculo_anio;
  let anio: number | null = null;
  if (anioRaw != null && anioRaw !== '') {
    const n = Number(anioRaw);
    anio = Number.isFinite(n) ? n : null;
  }
  const modalidad = snapStr(snap, 'modalidad') === 'domicilio' ? 'domicilio' : 'taller';
  const serviciosLineas = Array.isArray(snap.servicios_lineas) ? snap.servicios_lineas : undefined;

  return {
    id: -plantilla.id,
    conversation: null,
    estado: 'borrador',
    modalidad,
    vehiculo_marca: snapStr(snap, 'vehiculo_marca') || plantilla.vehiculo_marca || '',
    vehiculo_modelo: snapStr(snap, 'vehiculo_modelo') || plantilla.vehiculo_modelo || '',
    vehiculo_anio: anio,
    vehiculo_patente: snapStr(snap, 'vehiculo_patente'),
    vehiculo_cilindraje: snapStr(snap, 'vehiculo_cilindraje') || plantilla.vehiculo_cilindraje || '',
    vehiculo_vin: snapStr(snap, 'vehiculo_vin'),
    tipo_motor: snapStr(snap, 'tipo_motor'),
    tipo_motor_label: snapStr(snap, 'tipo_motor_label'),
    aviso_motor: snapStr(snap, 'aviso_motor'),
    servicio_nombre: tituloServicioPlantilla(plantilla),
    descripcion_problema: snapStr(snap, 'descripcion_problema'),
    repuestos,
    mano_obra_clp: snapNum(snap, 'mano_obra_clp'),
    costo_repuestos_clp: snapNum(snap, 'costo_repuestos_clp'),
    total_clp: snapNum(snap, 'total_clp') || totalPlantilla(plantilla),
    duracion_minutos_estimada: snap.duracion_minutos_estimada
      ? Number(snap.duracion_minutos_estimada)
      : null,
    advertencias: Array.isArray(snap.advertencias)
      ? (snap.advertencias as unknown[]).map((a) => String(a)).filter(Boolean)
      : [],
    cliente_nombre: snapStr(snap, 'cliente_nombre'),
    cliente_telefono: snapStr(snap, 'cliente_telefono'),
    direccion_servicio: snapStr(snap, 'direccion_servicio'),
    actualizado_en: plantilla.actualizado_en,
    metadata: {
      origen: plantilla.aprendizaje_auto ? 'plantilla_auto' : 'plantilla',
      plantilla_id: plantilla.id,
      servicios_lineas: serviciosLineas as CotizacionCanal['metadata'] extends { servicios_lineas?: infer S }
        ? S
        : never,
      valores_estimativos: Boolean(snap.valores_estimativos),
      precio_desde_catalogo: Boolean(snap.precio_desde_catalogo),
    },
  };
}

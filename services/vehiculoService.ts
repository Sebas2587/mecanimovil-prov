import { get } from './api';

export type ConsultaPatenteResponse = {
  patente: string;
  marca_nombre?: string;
  modelo_nombre?: string;
  year?: number | null;
  color?: string | null;
  motor?: string | null;
  cilindraje?: string | null;
  vin?: string | null;
  tipo_motor?: string | null;
};

export type HistorialRedFuente = 'orden_plataforma' | 'informe' | 'cita_personal';

export type HistorialRedRangoMercado = {
  min: number;
  max: number;
  muestras: number;
};

export type HistorialRedEvento = {
  fecha: string | null;
  taller_nombre: string;
  taller_es_propio: boolean;
  servicio_nombre: string;
  kilometraje: number | null;
  monto_clp: number | null;
  rango_mercado_clp: HistorialRedRangoMercado | null;
  fuente: HistorialRedFuente;
  evento_id: string;
};

export type HistorialRedResponse = {
  patente: string;
  vehiculo: { marca: string; modelo: string; anio: number | null } | null;
  eventos: HistorialRedEvento[];
};

export function compactarPatente(raw: string): string {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function patenteHistorialValida(raw: string): boolean {
  const compact = compactarPatente(raw);
  return compact.length >= 5 && compact.length <= 8;
}

export function rutaHistorialPatente(patente: string): string {
  return `/historial-patente?patente=${encodeURIComponent(compactarPatente(patente))}`;
}

export async function consultarPatente(patente: string): Promise<ConsultaPatenteResponse> {
  const normalized = compactarPatente(patente);
  const response = await get(`/vehiculos/consultar-patente/?patente=${encodeURIComponent(normalized)}`);
  return response.data as ConsultaPatenteResponse;
}

export async function consultarHistorialRed(patente: string): Promise<HistorialRedResponse> {
  const normalized = compactarPatente(patente);
  const response = await get(`/vehiculos/historial-red/?patente=${encodeURIComponent(normalized)}`);
  return response.data as HistorialRedResponse;
}

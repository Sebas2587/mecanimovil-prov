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

export async function consultarPatente(patente: string): Promise<ConsultaPatenteResponse> {
  const normalized = patente.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  const response = await get(`/vehiculos/consultar-patente/?patente=${encodeURIComponent(normalized)}`);
  return response.data as ConsultaPatenteResponse;
}

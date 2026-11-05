import api from '@/services/api';
import {
  falloDesdeAxios,
  type AnclaTipo,
  type CuerpoCobro,
  type CuerpoCosto,
  type GranularidadCaja,
  type LibroCaja,
  type MovimientoCaja,
} from '@/utils/cajaTaller';

export type ConsultaCaja = {
  desde: string;
  hasta: string;
  granularidad: GranularidadCaja;
  page?: number;
  pageSize?: number;
  casosPage?: number;
  anclaTipo?: AnclaTipo | '';
  anclaId?: string;
};

function paramsConsulta(consulta: ConsultaCaja): string {
  const params = new URLSearchParams();
  params.set('desde', consulta.desde);
  params.set('hasta', consulta.hasta);
  params.set('granularidad', consulta.granularidad);
  params.set('page', String(consulta.page ?? 1));
  params.set('casos_page', String(consulta.casosPage ?? 1));
  if (consulta.pageSize) params.set('page_size', String(consulta.pageSize));
  if (consulta.anclaTipo && consulta.anclaId) {
    params.set('ancla_tipo', consulta.anclaTipo);
    params.set('ancla_id', consulta.anclaId);
  }
  return params.toString();
}

/**
 * Un solo GET del período. Cada caso y cada movimiento trae cliente_nombre,
 * vehiculo_patente y folio, o null si no hay dato. No se pide el caso otra vez.
 */
export async function consultarCaja(consulta: ConsultaCaja): Promise<LibroCaja> {
  try {
    const respuesta = await api.get(`/ordenes/caja/?${paramsConsulta(consulta)}`);
    return respuesta.data as LibroCaja;
  } catch (error) {
    throw falloDesdeAxios(error);
  }
}

export async function registrarCobro(cuerpo: CuerpoCobro, clave: string): Promise<MovimientoCaja> {
  try {
    const respuesta = await api.post('/ordenes/caja/cobros/', cuerpo, {
      headers: { 'Idempotency-Key': clave },
    });
    return respuesta.data as MovimientoCaja;
  } catch (error) {
    throw falloDesdeAxios(error);
  }
}

export async function registrarCosto(cuerpo: CuerpoCosto): Promise<{
  id: string;
  ancla_tipo: string;
  ancla_id: string;
  componente: string;
  tipo: string;
  monto_clp: number;
  moneda: string;
  vigente: boolean;
}> {
  try {
    const respuesta = await api.post('/ordenes/caja/costos/', cuerpo);
    return respuesta.data;
  } catch (error) {
    throw falloDesdeAxios(error);
  }
}

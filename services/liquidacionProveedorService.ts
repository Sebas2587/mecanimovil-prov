import { getAPI } from './api';

export interface LiquidacionProveedor {
  id: string;
  estado: 'pendiente' | 'procesada' | 'pagada' | 'cancelada';
  estado_display: string;
  monto_cobrado_cliente: number;
  comision_plataforma: number;
  monto_neto_proveedor: number;
  moneda: string;
  oferta_id: string | null;
  orden_id: number | null;
  referencia_transferencia: string;
  fecha_liquidacion: string | null;
  notas: string;
  creado_en: string;
  actualizado_en: string;
}

export interface LiquidacionResumen {
  saldo_pendiente_clp: number;
  cantidad_pendiente: number;
  total_liquidado_clp: number;
}

const BASE = '/mercadopago/liquidaciones-proveedor/';

const liquidacionProveedorService = {
  async listar(estado?: string): Promise<LiquidacionProveedor[]> {
    const api = await getAPI();
    const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
    const response = await api.get(`${BASE}${query}`);
    return response.data?.results || response.data || [];
  },

  async resumen(): Promise<LiquidacionResumen> {
    const api = await getAPI();
    const response = await api.get(`${BASE}resumen/`);
    return response.data;
  },
};

export default liquidacionProveedorService;

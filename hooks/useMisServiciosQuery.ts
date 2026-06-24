import { useQuery } from '@tanstack/react-query';
import { serviciosAPI } from '@/services/api';
import { parseMisMarcasResponse } from '@/utils/parseMisMarcasResponse';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

export const MIS_SERVICIOS_QUERY_KEY = ['mis-servicios-ofertas'] as const;

export type MarcaProveedorRow = { id: number; nombre: string; logo?: string | null };

export type ServicioOfertaRow = {
  id: number;
  servicio: number;
  servicio_info: {
    id: number;
    nombre: string;
    descripcion: string;
    requiere_repuestos: boolean;
    foto: string | null;
    tipos_motor_compatibles?: string[];
    motores_info?: string[];
    categorias_info?: Array<{ id: number; nombre: string }>;
  };
  marca_vehiculo_seleccionada: number | null;
  marca_vehiculo_info: {
    id: number;
    nombre: string;
    logo: string | null;
  } | null;
  modelo_vehiculo_seleccionado?: number | null;
  modelo_vehiculo_info?: {
    id: number;
    nombre: string;
    marca_id?: number;
    marca_nombre?: string;
  } | null;
  tipo_motor?: string;
  tipo_servicio: 'con_repuestos' | 'sin_repuestos';
  disponible: boolean;
  duracion_estimada: string | null;
  incluye_garantia: boolean;
  duracion_garantia: number;
  detalles_adicionales: string | null;
  repuestos_seleccionados: unknown[];
  repuestos_info: unknown[];
  costo_mano_de_obra_sin_iva: string;
  costo_repuestos_sin_iva: string;
  precio_publicado_cliente: string;
  comision_mecanmovil: string;
  iva_sobre_comision: string;
  ganancia_neta_proveedor: string;
  desglose_precios: {
    costo_total_sin_iva: number;
    iva_19_porciento: number;
    precio_final_cliente: number;
    comision_mecanmovil_20_porciento: number;
    iva_sobre_comision: number;
    ganancia_neta_proveedor: number;
    monto_transferido: number;
  };
  fecha_creacion: string;
  ultima_actualizacion: string;
  fotos_urls: string[];
};

export type MisServiciosData = {
  servicios: ServicioOfertaRow[];
  marcasLookup: Map<number, MarcaProveedorRow>;
};

function enriquecerOfertasConMarcas(
  ofertas: ServicioOfertaRow[],
  marcasProveedor: MarcaProveedorRow[],
): ServicioOfertaRow[] {
  const byId = new Map(marcasProveedor.map((m) => [m.id, m]));
  return ofertas.map((s) => {
    if (s.marca_vehiculo_info?.nombre?.trim()) {
      return s;
    }
    const raw = s.marca_vehiculo_seleccionada;
    const mid = typeof raw === 'number' ? raw : raw != null ? Number(raw) : NaN;
    if (!Number.isFinite(mid) || mid <= 0) {
      return s;
    }
    const m = byId.get(mid);
    const nombre = m?.nombre?.trim();
    if (!nombre) {
      return s;
    }
    return {
      ...s,
      marca_vehiculo_info: {
        id: mid,
        nombre,
        logo: m?.logo != null ? m.logo : null,
      },
    };
  });
}

async function fetchMisServicios(): Promise<MisServiciosData> {
  const [resServicios, resMarcas] = await Promise.all([
    serviciosAPI.obtenerMisServicios(),
    serviciosAPI.obtenerMisMarcas().catch(() => ({ data: [] as MarcaProveedorRow[] })),
  ]);
  const raw = resServicios.data?.results || resServicios.data || [];
  const lista = Array.isArray(raw) ? (raw as ServicioOfertaRow[]) : [];
  const marcasParsed = parseMisMarcasResponse(resMarcas?.data ?? resMarcas);
  const marcasArr = marcasParsed.marcas as MarcaProveedorRow[];
  const servicios = enriquecerOfertasConMarcas(lista, marcasArr);
  return {
    servicios,
    marcasLookup: new Map(marcasArr.map((m) => [m.id, m])),
  };
}

export function useMisServiciosQuery(enabled = true) {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: MIS_SERVICIOS_QUERY_KEY,
    queryFn: fetchMisServicios,
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
  });

  return {
    servicios: data?.servicios ?? [],
    marcasLookup: data?.marcasLookup ?? new Map<number, MarcaProveedorRow>(),
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}

import { useQuery, type QueryClient } from '@tanstack/react-query';
import {
  proveedorVerificadoAPI,
  vehiculoAPI,
  modelosAPI,
  type MarcaVehiculo,
  type ModeloVehiculo,
} from '@/services/api';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

export type EspecialidadesMarcasData = {
  todasMarcas: MarcaVehiculo[];
  modelosPorMarca: Record<number, ModeloVehiculo[]>;
  marcasActuales: MarcaVehiculo[];
  marcasSeleccionadasIds: number[];
};

export function especialidadesMarcasQueryKey() {
  return ['especialidades-marcas-catalogo'] as const;
}

export function invalidateEspecialidadesMarcasQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: especialidadesMarcasQueryKey() });
}

async function fetchEspecialidadesMarcas(): Promise<EspecialidadesMarcasData> {
  const marcasData = await vehiculoAPI.obtenerMarcas();
  const modelosData = await modelosAPI.obtenerTodosLosModelos();

  const modelosPorMarca: Record<number, ModeloVehiculo[]> = {};
  modelosData.forEach((modelo: ModeloVehiculo) => {
    if (!modelosPorMarca[modelo.marca]) {
      modelosPorMarca[modelo.marca] = [];
    }
    modelosPorMarca[modelo.marca].push(modelo);
  });

  let marcasActuales: MarcaVehiculo[] = [];
  let marcasSeleccionadasIds: number[] = [];

  try {
    const datosProveedor = await proveedorVerificadoAPI.obtenerDatosCompletos();
    const atendidas = datosProveedor.data?.marcas_atendidas;

    if (atendidas && Array.isArray(atendidas)) {
      if (atendidas.length > 0 && typeof atendidas[0] === 'object') {
        marcasActuales = atendidas as MarcaVehiculo[];
        marcasSeleccionadasIds = marcasActuales.map((marca) => marca.id);
      } else {
        const ids = atendidas as number[];
        marcasActuales = marcasData.filter((marca: MarcaVehiculo) => ids.includes(marca.id));
        marcasSeleccionadasIds = ids;
      }
    }
  } catch (error) {
    console.warn('⚠️ No se pudieron cargar datos actuales del proveedor:', error);
  }

  return {
    todasMarcas: marcasData,
    modelosPorMarca,
    marcasActuales,
    marcasSeleccionadasIds,
  };
}

export function useEspecialidadesMarcasQuery(enabled = true) {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: especialidadesMarcasQueryKey(),
    queryFn: fetchEspecialidadesMarcas,
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
  });

  return {
    data: data ?? null,
    todasMarcas: data?.todasMarcas ?? [],
    modelosPorMarca: data?.modelosPorMarca ?? {},
    marcasActuales: data?.marcasActuales ?? [],
    marcasSeleccionadasIds: data?.marcasSeleccionadasIds ?? [],
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}

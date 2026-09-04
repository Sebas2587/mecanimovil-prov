import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import proveedorRepuestosService, {
  type PrecioProveedorTaller,
  type ProveedorRepuestos,
} from '@/services/proveedorRepuestosService';

export const PROVEEDORES_REPUESTOS_KEY = 'proveedores-repuestos';
export const MIS_PRECIOS_REPUESTOS_KEY = 'mis-precios-repuestos';

export function useProveedoresRepuestosQuery(enabled = true) {
  return useQuery({
    queryKey: [PROVEEDORES_REPUESTOS_KEY],
    queryFn: () => proveedorRepuestosService.listarProveedores(),
    enabled,
    staleTime: 60_000,
  });
}

export function useMisPreciosRepuestosQuery(q = '', enabled = true) {
  return useQuery({
    queryKey: [MIS_PRECIOS_REPUESTOS_KEY, q],
    queryFn: () => proveedorRepuestosService.listarPrecios({ q: q || undefined }),
    enabled,
    staleTime: 30_000,
  });
}

export function useCrearProveedorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ProveedorRepuestos>) =>
      proveedorRepuestosService.crearProveedor(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROVEEDORES_REPUESTOS_KEY] });
    },
  });
}

export function useActualizarProveedorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ProveedorRepuestos> }) =>
      proveedorRepuestosService.actualizarProveedor(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROVEEDORES_REPUESTOS_KEY] });
    },
  });
}

export function useEliminarProveedorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => proveedorRepuestosService.eliminarProveedor(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROVEEDORES_REPUESTOS_KEY] });
    },
  });
}

export function useActualizarPrecioPropioMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<PrecioProveedorTaller> }) =>
      proveedorRepuestosService.actualizarPrecio(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MIS_PRECIOS_REPUESTOS_KEY] });
    },
  });
}

export function useEliminarPrecioPropioMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => proveedorRepuestosService.eliminarPrecio(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MIS_PRECIOS_REPUESTOS_KEY] });
    },
  });
}

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
    mutationFn: (input: { payload: Partial<ProveedorRepuestos>; confirmarRolCliente?: boolean }) =>
      proveedorRepuestosService.crearProveedor(input.payload, {
        confirmarRolCliente: input.confirmarRolCliente,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROVEEDORES_REPUESTOS_KEY] });
      qc.invalidateQueries({ queryKey: ['chat-inbox'] });
    },
  });
}

export function useActualizarProveedorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      confirmarRolCliente,
    }: {
      id: number;
      payload: Partial<ProveedorRepuestos>;
      confirmarRolCliente?: boolean;
    }) => proveedorRepuestosService.actualizarProveedor(id, payload, { confirmarRolCliente }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROVEEDORES_REPUESTOS_KEY] });
      qc.invalidateQueries({ queryKey: ['chat-inbox'] });
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

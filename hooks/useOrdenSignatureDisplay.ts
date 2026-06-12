import { useQuery } from '@tanstack/react-query';
import { ordenesProveedorService } from '@/services/ordenesProveedor';
import { ordenToSignatureDisplay } from '@/utils/formatOrdenSignatureInfo';

export function useOrdenSignatureDisplay(ordenId: number | null | undefined) {
  const { data } = useQuery({
    queryKey: ['orden-signature-display', ordenId],
    queryFn: async () => {
      const res = await ordenesProveedorService.obtenerDetalle(ordenId!);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'No se pudo cargar la orden');
      }
      return ordenToSignatureDisplay(res.data);
    },
    staleTime: 60_000,
    enabled: !!ordenId && ordenId > 0,
  });

  return (
    data ?? {
      cliente: 'Cliente',
      vehiculo: 'Vehículo no disponible',
    }
  );
}

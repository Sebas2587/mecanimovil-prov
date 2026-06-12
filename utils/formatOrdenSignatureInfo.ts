import {
  obtenerNombreSeguro,
  type Orden,
} from '@/services/ordenesProveedor';

export type OrdenSignatureDisplay = {
  cliente: string;
  vehiculo: string;
};

export function formatClienteFromOrden(orden: Orden | null | undefined): string {
  if (!orden?.cliente_detail) return 'Cliente';
  const nombre = obtenerNombreSeguro(orden.cliente_detail).trim();
  return nombre || 'Cliente';
}

export function formatVehiculoFromOrden(orden: Orden | null | undefined): string {
  const vehiculo = orden?.vehiculo_detail;
  if (!vehiculo) return 'Vehículo no disponible';

  const marca = vehiculo.marca?.trim();
  const modelo = vehiculo.modelo?.trim();
  const año = vehiculo.año ?? (vehiculo as { year?: number }).year;

  const partes: string[] = [];
  if (marca) partes.push(marca);
  if (modelo) partes.push(modelo);
  if (año != null && año !== 0) partes.push(String(año));

  return partes.length > 0 ? partes.join(' ') : 'Vehículo no disponible';
}

export function ordenToSignatureDisplay(orden: Orden | null | undefined): OrdenSignatureDisplay {
  return {
    cliente: formatClienteFromOrden(orden),
    vehiculo: formatVehiculoFromOrden(orden),
  };
}

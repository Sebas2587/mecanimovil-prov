import api from './api';

export interface ProveedorRepuestos {
  id: number;
  nombre: string;
  tipo: 'mostrador' | 'distribuidor' | 'concesionario' | 'marketplace' | string;
  comuna?: string;
  telefono?: string;
  direccion?: string;
  dominio?: string;
  descuento_pct?: number;
  dias_credito?: number;
  entrega?: 'retiro' | 'despacho' | 'ambos' | string;
  es_preferido?: boolean;
  activo?: boolean;
  notas?: string;
}

export interface PrecioProveedorTaller {
  id: number;
  proveedor?: number | null;
  proveedor_nombre?: string;
  nombre_repuesto: string;
  marca_repuesto?: string;
  codigo_parte?: string;
  especificacion?: string;
  categoria?: string;
  precio_clp: number;
  precio_venta_clp?: number;
  vehiculo_marca?: string;
  vehiculo_modelo?: string;
  vehiculo_anio?: number | null;
  tipo_motor?: string;
  cilindraje?: string;
  origen?: string;
  vigente?: boolean;
  registrado_en?: string;
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: T[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

class ProveedorRepuestosService {
  async listarProveedores(): Promise<ProveedorRepuestos[]> {
    const response = await api.get('/ordenes/proveedores-repuestos/', { params: { activos: 1 } });
    return unwrapList<ProveedorRepuestos>(response.data);
  }

  async crearProveedor(payload: Partial<ProveedorRepuestos>): Promise<ProveedorRepuestos> {
    const response = await api.post('/ordenes/proveedores-repuestos/', payload);
    return response.data as ProveedorRepuestos;
  }

  async actualizarProveedor(id: number, payload: Partial<ProveedorRepuestos>): Promise<ProveedorRepuestos> {
    const response = await api.patch(`/ordenes/proveedores-repuestos/${id}/`, payload);
    return response.data as ProveedorRepuestos;
  }

  async eliminarProveedor(id: number): Promise<void> {
    await api.delete(`/ordenes/proveedores-repuestos/${id}/`);
  }

  async listarPrecios(params?: { q?: string; vigente?: boolean }): Promise<PrecioProveedorTaller[]> {
    const response = await api.get('/ordenes/mis-precios-repuestos/', {
      params: {
        q: params?.q || undefined,
        vigente: params?.vigente ? 1 : undefined,
      },
    });
    return unwrapList<PrecioProveedorTaller>(response.data);
  }

  async actualizarPrecio(id: number, payload: Partial<PrecioProveedorTaller>): Promise<PrecioProveedorTaller> {
    const response = await api.patch(`/ordenes/mis-precios-repuestos/${id}/`, payload);
    return response.data as PrecioProveedorTaller;
  }

  async eliminarPrecio(id: number): Promise<void> {
    await api.delete(`/ordenes/mis-precios-repuestos/${id}/`);
  }
}

export const proveedorRepuestosService = new ProveedorRepuestosService();
export default proveedorRepuestosService;

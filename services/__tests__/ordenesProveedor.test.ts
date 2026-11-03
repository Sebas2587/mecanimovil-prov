/**
 * Tests para servicios de órdenes del proveedor
 * Verifica lógica de deduplicación de órdenes
 */
import { dedupeOrdenesPorIdYOferta, type Orden } from '../ordenesProveedor';

describe('ordenesProveedor', () => {
  describe('dedupeOrdenesPorIdYOferta', () => {
    it('debe eliminar órdenes duplicadas por ID', () => {
      const ordenes: Orden[] = [
        {
          id: 1,
          numero_publico: 'ORD-001',
          cliente_detail: { id: 1, nombre_ofuscado: 'Cliente A', telefono_ofuscado: '***1234' },
          vehiculo_detail: { marca: 'Toyota', modelo: 'Corolla', año: 2020 },
          fecha_hora_solicitud: '2024-01-01T10:00:00Z',
          tipo_servicio: 'taller',
          fecha_servicio: '2024-01-02',
          hora_servicio: '10:00',
          total: '100000',
          estado: 'pagado',
          estado_display: 'Pagado',
          lineas: [],
          informacion_disponible: { nivel_acceso: 'parcial', puede_contactar: false },
          puede_gestionar: true,
          oferta_proveedor_id: 'oferta-1',
        },
        {
          id: 1,
          numero_publico: 'ORD-001',
          cliente_detail: { id: 1, nombre_ofuscado: 'Cliente A', telefono_ofuscado: '***1234' },
          vehiculo_detail: { marca: 'Toyota', modelo: 'Corolla', año: 2020 },
          fecha_hora_solicitud: '2024-01-01T10:00:00Z',
          tipo_servicio: 'taller',
          fecha_servicio: '2024-01-02',
          hora_servicio: '10:00',
          total: '100000',
          estado: 'confirmado',
          estado_display: 'Confirmado',
          lineas: [],
          informacion_disponible: { nivel_acceso: 'parcial', puede_contactar: false },
          puede_gestionar: true,
          oferta_proveedor_id: 'oferta-1',
        },
      ];

      const result = dedupeOrdenesPorIdYOferta(ordenes);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('debe mantener el estado más terminal cuando hay duplicados por oferta', () => {
      const ordenes: Orden[] = [
        {
          id: 1,
          numero_publico: 'ORD-001',
          cliente_detail: { id: 1, nombre_ofuscado: 'Cliente A', telefono_ofuscado: '***1234' },
          vehiculo_detail: { marca: 'Toyota', modelo: 'Corolla', año: 2020 },
          fecha_hora_solicitud: '2024-01-01T10:00:00Z',
          tipo_servicio: 'taller',
          fecha_servicio: '2024-01-02',
          hora_servicio: '10:00',
          total: '100000',
          estado: 'confirmado',
          estado_display: 'Confirmado',
          lineas: [],
          informacion_disponible: { nivel_acceso: 'parcial', puede_contactar: false },
          puede_gestionar: true,
          oferta_proveedor_id: 'oferta-1',
        },
        {
          id: 2,
          numero_publico: 'ORD-001',
          cliente_detail: { id: 1, nombre_ofuscado: 'Cliente A', telefono_ofuscado: '***1234' },
          vehiculo_detail: { marca: 'Toyota', modelo: 'Corolla', año: 2020 },
          fecha_hora_solicitud: '2024-01-01T10:00:00Z',
          tipo_servicio: 'taller',
          fecha_servicio: '2024-01-02',
          hora_servicio: '10:00',
          total: '100000',
          estado: 'completado',
          estado_display: 'Completado',
          lineas: [],
          informacion_disponible: { nivel_acceso: 'completo', puede_contactar: true },
          puede_gestionar: true,
          oferta_proveedor_id: 'oferta-1',
        },
      ];

      const result = dedupeOrdenesPorIdYOferta(ordenes);

      expect(result).toHaveLength(1);
      // Debe mantener el completado (terminal) sobre confirmado (intermedio)
      expect(result[0].estado).toBe('completado');
      expect(result[0].id).toBe(2);
    });

    it('debe mantener órdenes sin oferta_proveedor_id separadas', () => {
      const ordenes: Orden[] = [
        {
          id: 1,
          numero_publico: 'ORD-001',
          cliente_detail: { id: 1, nombre_ofuscado: 'Cliente A', telefono_ofuscado: '***1234' },
          vehiculo_detail: { marca: 'Toyota', modelo: 'Corolla', año: 2020 },
          fecha_hora_solicitud: '2024-01-01T10:00:00Z',
          tipo_servicio: 'taller',
          fecha_servicio: '2024-01-02',
          hora_servicio: '10:00',
          total: '100000',
          estado: 'pagado',
          estado_display: 'Pagado',
          lineas: [],
          informacion_disponible: { nivel_acceso: 'parcial', puede_contactar: false },
          puede_gestionar: true,
          oferta_proveedor_id: null,
        },
        {
          id: 2,
          numero_publico: 'ORD-002',
          cliente_detail: { id: 2, nombre_ofuscado: 'Cliente B', telefono_ofuscado: '***5678' },
          vehiculo_detail: { marca: 'Honda', modelo: 'Civic', año: 2021 },
          fecha_hora_solicitud: '2024-01-01T11:00:00Z',
          tipo_servicio: 'domicilio',
          fecha_servicio: '2024-01-03',
          hora_servicio: '14:00',
          total: '150000',
          estado: 'confirmado',
          estado_display: 'Confirmado',
          lineas: [],
          informacion_disponible: { nivel_acceso: 'parcial', puede_contactar: false },
          puede_gestionar: true,
          oferta_proveedor_id: null,
        },
      ];

      const result = dedupeOrdenesPorIdYOferta(ordenes);

      expect(result).toHaveLength(2);
      expect(result.map((o) => o.id).sort()).toEqual([1, 2]);
    });

    it('debe manejar lista vacía', () => {
      const result = dedupeOrdenesPorIdYOferta([]);
      expect(result).toEqual([]);
    });

    it('debe preferir ID mayor en empate de estado terminal', () => {
      const ordenes: Orden[] = [
        {
          id: 1,
          numero_publico: 'ORD-001',
          cliente_detail: { id: 1, nombre_ofuscado: 'Cliente A', telefono_ofuscado: '***1234' },
          vehiculo_detail: { marca: 'Toyota', modelo: 'Corolla', año: 2020 },
          fecha_hora_solicitud: '2024-01-01T10:00:00Z',
          tipo_servicio: 'taller',
          fecha_servicio: '2024-01-02',
          hora_servicio: '10:00',
          total: '100000',
          estado: 'completado',
          estado_display: 'Completado',
          lineas: [],
          informacion_disponible: { nivel_acceso: 'completo', puede_contactar: true },
          puede_gestionar: true,
          oferta_proveedor_id: 'oferta-1',
        },
        {
          id: 3,
          numero_publico: 'ORD-001',
          cliente_detail: { id: 1, nombre_ofuscado: 'Cliente A', telefono_ofuscado: '***1234' },
          vehiculo_detail: { marca: 'Toyota', modelo: 'Corolla', año: 2020 },
          fecha_hora_solicitud: '2024-01-01T10:00:00Z',
          tipo_servicio: 'taller',
          fecha_servicio: '2024-01-02',
          hora_servicio: '10:00',
          total: '100000',
          estado: 'completado',
          estado_display: 'Completado',
          lineas: [],
          informacion_disponible: { nivel_acceso: 'completo', puede_contactar: true },
          puede_gestionar: true,
          oferta_proveedor_id: 'oferta-1',
        },
      ];

      const result = dedupeOrdenesPorIdYOferta(ordenes);

      expect(result).toHaveLength(1);
      // Debe mantener el de ID mayor (más reciente)
      expect(result[0].id).toBe(3);
    });
  });
});

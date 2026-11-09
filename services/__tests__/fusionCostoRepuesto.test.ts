import { fusionarRepuestosEnviados } from '@/services/cotizacionCanalService';

describe('fusionarRepuestosEnviados', () => {
  it('conserva el costo local si la respuesta lo devuelve vacío', () => {
    const [linea] = fusionarRepuestosEnviados(
      [{
        id: 'f1',
        nombre: 'Filtro de aceite',
        cantidad: 2,
        precio_unitario_clp: 10000,
        costo_unitario_clp: 6000,
        costo_estimado_clp: 6000,
      }],
      [{
        id: 'f1',
        nombre: 'Filtro de aceite',
        cantidad: 2,
        precio_unitario_clp: 10000,
        costo_unitario_clp: null,
        costo_estimado_clp: null,
      }],
    );
    expect(linea.costo_unitario_clp).toBe(6000);
    expect(linea.costo_estimado_clp).toBe(6000);
    expect(linea.precio_unitario_clp).toBe(10000);
  });
});

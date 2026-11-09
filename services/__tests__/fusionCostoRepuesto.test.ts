import { fusionarRepuestosEnviados, mergeRepuestosPreservandoEdicion } from '@/services/cotizacionCanalService';

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

  it('conserva origen y estado de sugerencia si el PATCH los recorta', () => {
    const [linea] = fusionarRepuestosEnviados(
      [{
        id: 'b1',
        nombre: 'Bomba de embrague',
        cantidad: 1,
        precio_unitario_clp: 45000,
        origen: 'sugerencia',
        motivo_sugerencia: 'Complemento habitual',
        estado_sugerencia: 'aceptada',
      }],
      [{
        id: 'b1',
        nombre: 'Bomba de embrague',
        cantidad: 1,
        precio_unitario_clp: 45000,
      }],
    );
    expect(linea.origen).toBe('sugerencia');
    expect(linea.estado_sugerencia).toBe('aceptada');
    expect(linea.motivo_sugerencia).toBe('Complemento habitual');
  });

  it('conserva la decisión remota al aceptar una sugerencia', () => {
    const [linea] = mergeRepuestosPreservandoEdicion(
      [{
        id: 'bomba',
        nombre: 'Bomba de embrague',
        cantidad: 1,
        precio_unitario_clp: 45000,
        certeza: 'confirmado',
        origen: 'sugerencia',
        estado_sugerencia: 'pendiente',
        motivo_sugerencia: 'Suele cambiarse junto al kit en esta patente.',
      }],
      [{
        id: 'bomba',
        nombre: 'Bomba de embrague',
        cantidad: 1,
        precio_unitario_clp: 45000,
        certeza: 'confirmado',
        origen: 'sugerencia',
        estado_sugerencia: 'aceptada',
        motivo_sugerencia: 'Suele cambiarse junto al kit en esta patente.',
      }],
    );
    expect(linea.origen).toBe('sugerencia');
    expect(linea.estado_sugerencia).toBe('aceptada');
    expect(linea.precio_unitario_clp).toBe(45000);
  });

  it('al persistir, la decisión enviada gana sobre un snapshot viejo', () => {
    const [linea] = fusionarRepuestosEnviados(
      [{
        id: 'bomba',
        nombre: 'Bomba de embrague',
        cantidad: 1,
        precio_unitario_clp: 45000,
        origen: 'sugerencia',
        estado_sugerencia: 'aceptada',
        motivo_sugerencia: 'Suele cambiarse junto al kit en esta patente.',
      }],
      [{
        id: 'bomba',
        nombre: 'Bomba de embrague',
        cantidad: 1,
        precio_unitario_clp: 45000,
        origen: 'sugerencia',
        estado_sugerencia: 'pendiente',
        motivo_sugerencia: 'Suele cambiarse junto al kit en esta patente.',
      }],
    );
    expect(linea.estado_sugerencia).toBe('aceptada');
  });
});

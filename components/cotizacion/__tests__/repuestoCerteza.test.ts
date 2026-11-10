/**
 * Tests para funciones de selección y consolidación de casas de repuestos.
 */
import { describe, it, expect } from '@jest/globals';
import type { RepuestoCotizacion } from '@/services/cotizacionCanalService';
import {
  casaRepuestosLabel,
  fichasInternasDe,
  fichasOrigenSinRepetir,
  motivoSeleccionCasa,
  badgeConsolidacion,
  nombreFuente,
} from '../repuestoCerteza';

describe('casaRepuestosLabel', () => {
  it('muestra Imaparts si el precio salió de ahí, no Adriazola', () => {
    const rep: Partial<RepuestoCotizacion> = {
      proveedor_nombre: 'Imaparts',
      casa_sugerida: 'Adriazola',
      casa_repuesto_nombre: 'Adriazola',
      url_producto: 'https://www.imaparts.cl/kit',
    };
    expect(casaRepuestosLabel(rep as RepuestoCotizacion)).toBe('Imaparts');
  });

  it('si hay proveedor_nombre, no usa casa_repuesto_nombre como tienda del precio', () => {
    const rep: Partial<RepuestoCotizacion> = {
      casa_repuesto_nombre: 'Autoplanet',
      proveedor_nombre: 'Casa Antigua',
      tienda_ml: 'Tienda ML',
    };

    expect(casaRepuestosLabel(rep as RepuestoCotizacion)).toBe('Casa Antigua');
  });

  it('debe caer a proveedor_nombre si no hay casa_repuesto_nombre', () => {
    const rep: Partial<RepuestoCotizacion> = {
      proveedor_nombre: 'Sodimac',
      certeza: 'confirmado',
    };
    
    expect(casaRepuestosLabel(rep as RepuestoCotizacion)).toBe('Sodimac');
  });

  it('debe retornar null para precio asumido sin proveedor', () => {
    const rep: Partial<RepuestoCotizacion> = {
      certeza: 'asumido',
    };
    
    expect(casaRepuestosLabel(rep as RepuestoCotizacion)).toBeNull();
  });
});

describe('fichasOrigenSinRepetir', () => {
  it('no repite la tienda ni el enlace que ya están junto al precio', () => {
    const fichas = fichasOrigenSinRepetir({
      nombre: 'Kit de embrague',
      cantidad: 1,
      precio_unitario_clp: 89000,
      proveedor_nombre: 'Imaparts',
      url_producto: 'https://www.imaparts.cl/kit-embrague-oroch',
      nombre_producto: 'Kit de embrague Renault Oroch 2019',
      precio_marketplace_clp: 89000,
    } as RepuestoCotizacion);
    expect(fichas).toHaveLength(1);
    expect(fichas[0].tienda).toBe('');
    expect(fichas[0].url).toBeNull();
    expect(fichas[0].titulo).toBe('Kit de embrague Renault Oroch 2019');
    expect(fichas[0].precio).toBeNull();
  });

  it('omite el bloque si no queda ningún dato propio', () => {
    expect(fichasOrigenSinRepetir({
      nombre: 'Kit de embrague',
      cantidad: 1,
      precio_unitario_clp: 89000,
      proveedor_nombre: 'Imaparts',
      url_producto: 'https://www.imaparts.cl/kit',
    } as RepuestoCotizacion)).toEqual([]);
  });
});

describe('nombreFuente', () => {
  it('muestra el nombre humano y no pega el slug', () => {
    expect(nombreFuente({
      tienda: 'TodoAuto Chile',
      dominio: 'todoautochile.cl',
    })).toBe('TodoAuto Chile');
    expect(nombreFuente({
      tienda: 'Comercial Ramírez',
      dominio: 'Comercialramirezspa',
    })).toBe('Comercial Ramírez');
  });

  it('usa el dominio solo cuando no hay nombre de tienda', () => {
    expect(nombreFuente({ dominio: 'todoautochile.cl', fuente: 'web' })).toBe('todoautochile.cl');
  });

  it('la ficha de origen del precio no incluye el slug', () => {
    const fichas = fichasInternasDe({
      nombre: 'Filtro de aceite',
      cantidad: 1,
      precio_unitario_clp: 12000,
      fuentes_detalle: [{
        tienda: 'Comercial Ramírez',
        dominio: 'Comercialramirezspa',
        url: 'https://comercialramirez.cl/filtro',
        nombre: 'Filtro de aceite',
        precio_clp: 12000,
      }],
    } as RepuestoCotizacion);

    expect(fichas[0]?.tienda).toBe('Comercial Ramírez');
    expect(fichas[0]?.tienda).not.toContain('Comercialramirezspa');
  });
});

describe('motivoSeleccionCasa', () => {
  it('muestra motivo_tienda de la consolidación', () => {
    expect(motivoSeleccionCasa({
      nombre: 'Bomba de embrague',
      cantidad: 1,
      precio_unitario_clp: 28990,
      motivo_tienda: 'no disponible en Imaparts',
    } as RepuestoCotizacion)).toBe('No disponible en Imaparts');
    expect(motivoSeleccionCasa({
      nombre: 'Cilindro',
      cantidad: 1,
      precio_unitario_clp: 18990,
      motivo_tienda: '25% más barato en Todoauto',
      motivo_seleccion: '25% más barato en Todoauto',
    } as RepuestoCotizacion)).toBe('25% más barato en Todoauto');
  });

  it('debe retornar el motivo capitalizado', () => {
    const rep: Partial<RepuestoCotizacion> = {
      motivo_seleccion: 'mejor precio (ahorra $5.000), stock confirmado',
    };
    
    expect(motivoSeleccionCasa(rep as RepuestoCotizacion)).toBe(
      'Mejor precio (ahorra $5.000), stock confirmado'
    );
  });

  it('debe retornar null si no hay motivo', () => {
    const rep: Partial<RepuestoCotizacion> = {};
    
    expect(motivoSeleccionCasa(rep as RepuestoCotizacion)).toBeNull();
  });

  it('debe retornar null para motivo vacío', () => {
    const rep: Partial<RepuestoCotizacion> = {
      motivo_seleccion: '   ',
    };
    
    expect(motivoSeleccionCasa(rep as RepuestoCotizacion)).toBeNull();
  });

  it('debe capitalizar correctamente', () => {
    const rep: Partial<RepuestoCotizacion> = {
      motivo_seleccion: 'consolidación - todos los repuestos en una sola casa, disponible, entrega inmediata',
    };
    
    const resultado = motivoSeleccionCasa(rep as RepuestoCotizacion);
    expect(resultado).toBeTruthy();
    expect(resultado?.charAt(0)).toBe('C'); // Capitalizado
  });
});

describe('badgeConsolidacion', () => {
  it('debe retornar badge cuando hay consolidación', () => {
    const rep: Partial<RepuestoCotizacion> = {
      motivo_seleccion: 'consolidación - todos los repuestos en una sola casa',
    };
    
    expect(badgeConsolidacion(rep as RepuestoCotizacion)).toBe('📦 Consolidado');
  });

  it('debe retornar badge con acento en consolidación', () => {
    const rep: Partial<RepuestoCotizacion> = {
      motivo_seleccion: 'consolidacion en una casa',
    };
    
    expect(badgeConsolidacion(rep as RepuestoCotizacion)).toBe('📦 Consolidado');
  });

  it('debe retornar null si no menciona consolidación', () => {
    const rep: Partial<RepuestoCotizacion> = {
      motivo_seleccion: 'mejor precio, stock disponible',
    };
    
    expect(badgeConsolidacion(rep as RepuestoCotizacion)).toBeNull();
  });

  it('debe retornar null si no hay motivo', () => {
    const rep: Partial<RepuestoCotizacion> = {};
    
    expect(badgeConsolidacion(rep as RepuestoCotizacion)).toBeNull();
  });
});

describe('Caso completo: Repuesto consolidado', () => {
  it('debe mostrar toda la información de consolidación', () => {
    const repuesto: Partial<RepuestoCotizacion> = {
      nombre: 'Aceite sintético 5W30 (4L)',
      cantidad: 1,
      precio_unitario_clp: 32000,
      casa_repuesto_id: 'autoplanet',
      casa_repuesto_nombre: 'Autoplanet',
      motivo_seleccion: 'consolidación - todos los repuestos en una sola casa, mejor precio (ahorra $3.000), stock confirmado, entrega inmediata',
      alternativas_descartadas: 2,
      certeza: 'confirmado',
    };
    
    const casa = casaRepuestosLabel(repuesto as RepuestoCotizacion);
    const motivo = motivoSeleccionCasa(repuesto as RepuestoCotizacion);
    const badge = badgeConsolidacion(repuesto as RepuestoCotizacion);
    
    expect(casa).toBe('Autoplanet');
    expect(motivo).toBeTruthy();
    // El motivo está capitalizado
    expect(motivo?.toLowerCase()).toContain('consolidación');
    expect(motivo?.toLowerCase()).toContain('mejor precio');
    expect(badge).toBe('📦 Consolidado');
  });
});

describe('Caso completo: Repuesto no consolidado', () => {
  it('debe mostrar información de mejor opción individual', () => {
    const repuesto: Partial<RepuestoCotizacion> = {
      nombre: 'Filtro de aire',
      cantidad: 1,
      precio_unitario_clp: 12000,
      casa_repuesto_id: 'sodimac',
      casa_repuesto_nombre: 'Sodimac',
      motivo_seleccion: 'mejor precio (ahorra $2.000), disponible, cerca del taller (3.5km)',
      alternativas_descartadas: 1,
      certeza: 'confirmado',
    };
    
    const casa = casaRepuestosLabel(repuesto as RepuestoCotizacion);
    const motivo = motivoSeleccionCasa(repuesto as RepuestoCotizacion);
    const badge = badgeConsolidacion(repuesto as RepuestoCotizacion);
    
    expect(casa).toBe('Sodimac');
    expect(motivo).toBeTruthy();
    // El motivo está capitalizado
    expect(motivo?.toLowerCase()).toContain('mejor precio');
    expect(motivo?.toLowerCase()).toContain('cerca del taller');
    expect(badge).toBeNull(); // No es consolidación
  });
});

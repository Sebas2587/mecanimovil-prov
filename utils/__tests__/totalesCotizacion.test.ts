import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { lineasDesgloseCotizacion, textoTotalCobradoAlCliente, textoTotalCotizacion } from '@/utils/cotizacionPresentacion';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';
import {
  envioTotalBloqueado,
  lecturaTotalServidor,
  totalesDesdeLineas,
} from '@/utils/totalesCotizacion';

function base(parcial: Partial<CotizacionCanal> = {}): CotizacionCanal {
  return {
    id: 1,
    estado: 'borrador',
    modalidad: 'taller',
    vehiculo_marca: 'A',
    vehiculo_modelo: 'B',
    vehiculo_patente: 'AA',
    vehiculo_cilindraje: '',
    vehiculo_vin: '',
    tipo_motor: '',
    tipo_motor_label: '',
    aviso_motor: '',
    servicio_nombre: 'Servicio',
    descripcion_problema: '',
    repuestos: [],
    mano_obra_clp: 0,
    costo_repuestos_clp: 0,
    total_clp: 0,
    ...parcial,
  } as CotizacionCanal;
}

describe('totales de cotización con total nulo', () => {
  it('suma líneas completas y no usa el total guardado si no coincide', () => {
    const canon = totalesDesdeLineas({
      repuestos: [
        { nombre: 'Filtro', cantidad: 2, precio_unitario_clp: 1000 },
        { nombre: 'Pastillas', cantidad: 1, precio_unitario_clp: 500 },
      ],
      totalPersistido: 1000,
    });
    expect(canon.total_clp).toBe(2500);
    expect(canon.total_persistido_clp).toBe(1000);
    expect(canon.total_alineado).toBe(false);
    expect(canon.totales_completos).toBe(true);
    expect(canon.precios_iva).toBe('incluido');
  });

  it('un precio null o undefined deja el total null y nombra la línea', () => {
    const nulo = totalesDesdeLineas({
      repuestos: [
        { nombre: 'Filtro', cantidad: 1, precio_unitario_clp: 1000 },
        { nombre: 'Sensor', cantidad: 1, precio_unitario_clp: null },
      ],
    });
    const ausente = totalesDesdeLineas({
      repuestos: [
        { nombre: 'Filtro', cantidad: 1, precio_unitario_clp: 1000 },
        { nombre: 'Sensor', cantidad: 1 },
      ],
    });
    expect(nulo.total_clp).toBeNull();
    expect(nulo.totales_completos).toBe(false);
    expect(nulo.total_conocido_parcial_clp).toBe(1000);
    expect(nulo.totales_faltantes).toContain('Sensor');
    expect(ausente.total_clp).toBeNull();
    expect(ausente.totales_faltantes).toContain('Sensor');
  });

  it('el cero explícito es un total, no una línea faltante', () => {
    const canon = totalesDesdeLineas({
      repuestos: [{ nombre: 'Cortesía', cantidad: 1, precio_unitario_clp: 0 }],
      totalPersistido: 0,
    });
    expect(canon.totales_completos).toBe(true);
    expect(canon.total_clp).toBe(0);
    expect(canon.total_alineado).toBe(true);
  });

  it('la lectura del servidor no convierte null, undefined ni el flag en $0', () => {
    expect(lecturaTotalServidor({ total_clp: null }).texto).toBe('Incompleto');
    expect(lecturaTotalServidor({ total_clp: undefined }).enviable).toBe(false);
    expect(lecturaTotalServidor({ total_clp: 2500, totales_completos: false }).texto).toBe('Incompleto');
    expect(lecturaTotalServidor({ total_clp: 2500, totales_completos: false }).enviable).toBe(false);

    const cero = lecturaTotalServidor({ total_clp: 0 });
    expect(cero.texto).toBe(formatearMontoCLP(0));
    expect(cero.enviable).toBe(true);

    const viejo = lecturaTotalServidor({ total_clp: 2500 });
    expect(viejo.texto).toBe(formatearMontoCLP(2500));
    expect(viejo.enviable).toBe(true);
    expect(textoTotalCotizacion({ total_clp: null })).toBe('Incompleto');
  });

  it('un total guardado distinto no se muestra como el total ni como cero', () => {
    const lectura = lecturaTotalServidor({
      total_clp: null,
      totales_completos: false,
      total_persistido_clp: 1000,
      total_conocido_parcial_clp: 2500,
    });
    expect(lectura.texto).toBe('Incompleto');
    expect(lectura.persistido).toBe(1000);
    expect(lectura.parcial).toBe(2500);
    expect(lectura.texto).not.toContain('1');
  });

  it('no deja enviar una línea sin precio y sí deja enviar el cero', () => {
    expect(envioTotalBloqueado({
      repuestos: [{ precio_unitario_clp: null }],
      total_clp: 0,
    })).toMatch(/No se envía como \$0/);
    expect(envioTotalBloqueado({
      repuestos: [{ precio_unitario_clp: undefined }],
    })).toMatch(/No se envía como \$0/);
    expect(envioTotalBloqueado({
      repuestos: [{ precio_unitario_clp: 0 }],
      total_clp: 0,
    })).toBeNull();
    expect(envioTotalBloqueado({ total_clp: null })).toMatch(/incompleto/i);
    expect(envioTotalBloqueado({ total_clp: undefined })).toMatch(/incompleto/i);
    expect(envioTotalBloqueado({ total_clp: 0 })).toBeNull();
    expect(envioTotalBloqueado({ total_clp: 2500 })).toBeNull();
  });

  it('el desglose de una línea sin precio no es $0', () => {
    const lineas = lineasDesgloseCotizacion(base({
      repuestos: [
        { id: 'a', nombre: 'Sensor', cantidad: 1, precio_unitario_clp: null } as never,
        { id: 'b', nombre: 'Cortesía', cantidad: 1, precio_unitario_clp: 0 },
      ],
      total_clp: 0,
      totales_completos: false,
    }));
    expect(lineas.find((linea) => linea.label === 'Sensor')?.monto).toBeNull();
    expect(lineas.find((linea) => linea.label === 'Cortesía')?.monto).toBe(0);
    expect(textoTotalCotizacion(base({ total_clp: null as never, totales_completos: false }))).toBe('Incompleto');
  });

  it('el total cobrado ignora sugerencias pendientes aunque el servidor las sume', () => {
    const conSugerida = base({
      mano_obra_clp: 40000,
      total_clp: 213000,
      totales_completos: true,
      repuestos: [
        { id: 'kit', nombre: 'Kit', cantidad: 1, precio_unitario_clp: 120000, origen_linea: 'pedido' },
        {
          id: 'bomba',
          nombre: 'Bomba',
          cantidad: 1,
          precio_unitario_clp: 45000,
          origen_linea: 'sugerido',
          sugerencia_estado: 'pendiente',
        },
        { id: 'liq', nombre: 'Líquido', cantidad: 1, precio_unitario_clp: 8000, origen_linea: 'pedido' },
      ],
    });
    expect(textoTotalCotizacion(conSugerida)).toBe(formatearMontoCLP(213000));
    expect(textoTotalCobradoAlCliente(conSugerida)).toBe(formatearMontoCLP(168000));
    expect(textoTotalCobradoAlCliente({
      ...conSugerida,
      repuestos: conSugerida.repuestos.map((rep) => (
        rep.id === 'bomba' ? { ...rep, sugerencia_estado: 'aceptada' as const } : rep
      )),
    })).toBe(formatearMontoCLP(213000));
  });
});

import {
  cobraAlCliente,
  esperaRevisionTaller,
  hidratarDecisionesCotizacion,
  mensajeBloqueoDudas,
  resumenRevisionTaller,
  sugerenciaEstado,
  visibleAlCliente,
  type CotizacionDecision,
} from '@/utils/decisionCotizador';
import { envioTotalBloqueado, totalesDesdeLineas } from '@/utils/totalesCotizacion';

const pedido = {
  id: 'kit',
  nombre: 'Kit de embrague',
  origen: 'pedido' as const,
  estado_sugerencia: 'aceptada' as const,
  cantidad: 1,
  precio_unitario_clp: 120000,
};
const sugerido = {
  id: 'rod',
  nombre: 'Rodamiento de volante',
  origen: 'sugerencia' as const,
  motivo_sugerencia: 'No viene en el kit (disco, prensa y collarín de empuje).',
  estado_sugerencia: 'pendiente' as const,
  cantidad: 1,
  precio_unitario_clp: 12000,
};

describe('decisión del taller sobre líneas del cotizador', () => {
  it('no cobra una sugerencia pendiente ni descartada, y sí cobra la aceptada', () => {
    expect(cobraAlCliente(pedido)).toBe(true);
    expect(cobraAlCliente(sugerido)).toBe(false);
    expect(cobraAlCliente({ ...sugerido, estado_sugerencia: 'descartada' })).toBe(false);
    expect(cobraAlCliente({ ...sugerido, estado_sugerencia: 'aceptada' })).toBe(true);
    expect(visibleAlCliente({ ...sugerido, estado_sugerencia: 'pendiente' })).toBe(false);
  });

  it('el total ignora sugerencias pendientes y no las trata como incompletas', () => {
    const canon = totalesDesdeLineas({
      repuestos: [pedido, sugerido],
      manoObraLineas: [{ monto_clp: 30000 }],
    });
    expect(canon.total_clp).toBe(150000);
    expect(canon.totales_completos).toBe(true);
    expect(canon.costo_repuestos_clp).toBe(120000);
  });

  it('al aceptar la sugerencia entra al total', () => {
    const canon = totalesDesdeLineas({
      repuestos: [pedido, { ...sugerido, estado_sugerencia: 'aceptada' }],
    });
    expect(canon.costo_repuestos_clp).toBe(132000);
  });

  it('bloquea el envío si hay dudas pendientes', () => {
    const cotizacion = {
      repuestos: [pedido],
      dudas: [{
        id: 'd1',
        texto: '¿El kit incluye el rodamiento?',
        confirmada: false,
      }],
    };
    expect(mensajeBloqueoDudas(cotizacion)).toMatch(/duda/);
    expect(envioTotalBloqueado(cotizacion)).toMatch(/duda/);
    expect(esperaRevisionTaller(cotizacion)).toBe(true);
  });

  it('hidrata origen, estado, dudas y revision_sugerencias del contrato', () => {
    const hidratada = hidratarDecisionesCotizacion({
      repuestos: [{
        id: 'rod',
        nombre: 'Rodamiento de volante',
        origen: 'sugerencia',
        motivo_sugerencia: 'Complemento habitual.',
        estado_sugerencia: 'pendiente',
      }],
      dudas: [{ id: 'd1', texto: '¿Incluye rodamiento?', confirmada: false }],
      revision_sugerencias: { estado: 'pendiente', pendientes: 1 },
    } as CotizacionDecision);
    expect(sugerenciaEstado(hidratada.repuestos?.[0])).toBe('pendiente');
    expect(hidratada.repuestos?.[0]?.origen).toBe('sugerencia');
    expect(hidratada.repuestos?.[0]?.motivo_sugerencia).toBe('Complemento habitual.');
    expect(hidratada.dudas).toHaveLength(1);
    expect(hidratada.revision_sugerencias?.estado).toBe('pendiente');
    expect(esperaRevisionTaller(hidratada)).toBe(true);
  });

  it('si el listado no trae origen, usa revision_sugerencias.pendientes', () => {
    const lista = {
      repuestos: [{ id: 'kit', nombre: 'Kit de embrague', precio_unitario_clp: 120000 }],
      revision_sugerencias: { estado: 'pendiente', pendientes: 3 },
      dudas: [{ id: 'd1', texto: '¿DOT3 o DOT4?', confirmada: false }],
    };
    expect(esperaRevisionTaller(lista)).toBe(true);
    expect(resumenRevisionTaller(lista).sugerencias).toBe(3);
    expect(resumenRevisionTaller(lista).dudas).toBe(1);
  });
});

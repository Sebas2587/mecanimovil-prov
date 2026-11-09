import {
  cobraAlCliente,
  esperaRevisionTaller,
  hidratarDecisionesCotizacion,
  mensajeBloqueoDudas,
  puedeCerrarRevisionTaller,
  responderDuda,
  serializarDecisionesMetadata,
  sugerenciaEstado,
  visibleAlCliente,
  type CotizacionDecision,
} from '@/utils/decisionCotizador';
import { envioTotalBloqueado, totalesDesdeLineas } from '@/utils/totalesCotizacion';

const pedido = {
  id: 'kit',
  nombre: 'Kit de embrague',
  origen_linea: 'pedido' as const,
  cantidad: 1,
  precio_unitario_clp: 120000,
};
const sugerido = {
  id: 'bomba',
  nombre: 'Bomba de embrague',
  origen_linea: 'sugerido' as const,
  motivo_sugerencia: 'Suele ir con el kit en esta patente.',
  sugerencia_estado: 'pendiente' as const,
  cantidad: 1,
  precio_unitario_clp: 45000,
};

describe('decisión del taller sobre líneas del cotizador', () => {
  it('no cobra una sugerencia pendiente ni descartada, y sí cobra la aceptada', () => {
    expect(cobraAlCliente(pedido)).toBe(true);
    expect(cobraAlCliente(sugerido)).toBe(false);
    expect(cobraAlCliente({ ...sugerido, sugerencia_estado: 'descartada' })).toBe(false);
    expect(cobraAlCliente({ ...sugerido, sugerencia_estado: 'aceptada' })).toBe(true);
    expect(visibleAlCliente({ ...sugerido, sugerencia_estado: 'pendiente' })).toBe(false);
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
      repuestos: [pedido, { ...sugerido, sugerencia_estado: 'aceptada' }],
    });
    expect(canon.costo_repuestos_clp).toBe(165000);
  });

  it('bloquea el envío si hay dudas pendientes', () => {
    const cotizacion = {
      repuestos: [pedido],
      dudas_cotizador: [{
        id: 'd1',
        pregunta: '¿El kit incluye el rodamiento?',
        estado: 'pendiente',
      }],
    };
    expect(mensajeBloqueoDudas(cotizacion)).toMatch(/duda/);
    expect(envioTotalBloqueado(cotizacion)).toMatch(/duda/);
    expect(esperaRevisionTaller(cotizacion)).toBe(true);
    expect(puedeCerrarRevisionTaller(cotizacion)).toBe(false);
  });

  it('hidrata origen y estado desde metadata si el serializer recorta la línea', () => {
    const hidratada = hidratarDecisionesCotizacion({
      repuestos: [{ id: 'bomba', nombre: 'Bomba de embrague' }],
      metadata: {
        decisiones_lineas: {
          bomba: {
            origen_linea: 'sugerido',
            motivo_sugerencia: 'Complemento habitual.',
            sugerencia_estado: 'pendiente',
          },
        },
        dudas_cotizador: [{ id: 'd1', pregunta: '¿Incluye rodamiento?' }],
        revision_taller_estado: 'pendiente',
      },
    } as CotizacionDecision);
    expect(sugerenciaEstado(hidratada.repuestos?.[0])).toBe('pendiente');
    expect(hidratada.repuestos?.[0]?.motivo_sugerencia).toBe('Complemento habitual.');
    expect(hidratada.dudas_cotizador).toHaveLength(1);
    const meta = serializarDecisionesMetadata(hidratada);
    expect(meta.decisiones_lineas?.bomba?.origen_linea).toBe('sugerido');
  });

  it('responder una duda la saca de pendientes', () => {
    const next = responderDuda(
      [{ id: 'd1', pregunta: '¿Incluye rodamiento?', estado: 'pendiente' }],
      'd1',
      'No incluye',
    );
    expect(next[0].estado).toBe('respondida');
    expect(next[0].respuesta).toBe('No incluye');
  });
});

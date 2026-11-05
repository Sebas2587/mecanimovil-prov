import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import {
  duenoCaja,
  falloDesdeRespuesta,
  fechaSantiago,
  leerIntentoIncierto,
  olvidarIntentosCaja,
  type LibroCaja,
  type MovimientoCaja,
} from '@/utils/cajaTaller';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/components/Header', () => {
  const React = require('react');
  const { Text } = require('react-native');
  function Header({ title }: { title: string }) {
    return React.createElement(Text, null, title);
  }
  return { __esModule: true, default: Header };
});

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (efecto: () => void) => {
      React.useEffect(() => efecto(), [efecto]);
    },
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    usePathname: () => '/',
    useLocalSearchParams: () => ({}),
  };
});

type AuthCaja = {
  esMecanicoEquipo: boolean;
  usuario: { id: number } | null;
  estadoProveedor: { proveedor_id?: number } | null;
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => {
    const bolsa = globalThis as {
      __cajaAuth?: {
        esMecanicoEquipo: boolean;
        usuario: { id: number } | null;
        estadoProveedor: { proveedor_id?: number } | null;
      };
    };
    return bolsa.__cajaAuth ?? {
      esMecanicoEquipo: false,
      usuario: { id: 1 },
      estadoProveedor: { proveedor_id: 1 },
    };
  },
}));

const mockConsultar = jest.fn();
const mockRegistrar = jest.fn();
const mockCosto = jest.fn();
jest.mock('@/services/cajaTallerService', () => ({
  consultarCaja: (...args: unknown[]) => mockConsultar(...args),
  registrarCobro: (...args: unknown[]) => mockRegistrar(...args),
  registrarCosto: (...args: unknown[]) => mockCosto(...args),
}));

import CajaTallerScreen from '@/app/caja-taller';

const metricas = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function libroDe(desde: string, hasta: string, neto: number, movimientos: MovimientoCaja[] = []): LibroCaja {
  return {
    zona: 'America/Santiago',
    desde,
    hasta,
    granularidad: 'mes',
    resumen: {
      cobros_brutos_clp: neto,
      reembolsos_clp: 0,
      neto_clp: neto,
      pendientes_no_sumados_clp: 0,
      moneda: 'CLP',
      completo: true,
      conocido_parcial: false,
      faltantes: [],
      legacy_no_contabilizado: 0,
    },
    serie: [],
    movimientos: {
      count: movimientos.length,
      page: 1,
      page_size: 50,
      next: null,
      previous: null,
      results: movimientos,
    },
    casos: { count: 0, page: 1, page_size: 50, next: null, previous: null, results: [] },
  };
}

function movimiento(parcial: Partial<MovimientoCaja>): MovimientoCaja {
  return {
    id: 'entrada-30',
    ancla_tipo: 'cita',
    ancla_id: '15',
    componente: 'total',
    origen: 'manual',
    tipo: 'entrada',
    estado: 'confirmado',
    monto_clp: 30,
    moneda: 'CLP',
    contabiliza_clp: true,
    fecha_efectiva: '2026-11-05',
    fecha_local: '2026-11-05',
    ...parcial,
  };
}

function marco(ui: React.ReactElement) {
  return <SafeAreaProvider initialMetrics={metricas}>{ui}</SafeAreaProvider>;
}

describe('CajaTallerScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
    const bolsa = new Map<string, string>();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (clave: string) => bolsa.get(clave) ?? null,
        setItem: (clave: string, valor: string) => { bolsa.set(clave, valor); },
        removeItem: (clave: string) => { bolsa.delete(clave); },
      },
    });
    (globalThis as { __cajaAuth?: AuthCaja }).__cajaAuth = {
      esMecanicoEquipo: false,
      usuario: { id: 1 },
      estadoProveedor: { proveedor_id: 1 },
    };
    olvidarIntentosCaja();
    mockConsultar.mockReset();
    mockRegistrar.mockReset();
    mockCosto.mockReset();
    mockConsultar.mockImplementation(async (consulta: { desde: string; hasta: string }) => (
      libroDe(consulta.desde, consulta.hasta, 0)
    ));
  });

  async function asentar() {
    await act(async () => {
      await Promise.resolve();
    });
  }

  async function abrirCobro(view: Awaited<ReturnType<typeof render>>) {
    await waitFor(() => expect(view.getByText('No hay movimientos en este período.')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Registrar cobro'));
    await waitFor(() => expect(view.getByLabelText('Id del caso')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('Id del caso'), '15');
    await fireEvent.changeText(view.getByLabelText('Monto en pesos'), '30');
    await fireEvent.changeText(view.getByLabelText('Fecha efectiva'), '2026-11-05');
    await fireEvent.changeText(view.getByLabelText('Motivo'), 'abono');
    await fireEvent.press(view.getByText('Revisar'));
    await waitFor(() => expect(view.getByLabelText('Confirmar envío')).toBeTruthy());
  }

  it('un doble toque mientras el envío sigue abierto no manda dos POST', async () => {
    let resolver: (valor: unknown) => void = () => {};
    mockRegistrar.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
    const view = await render(marco(<CajaTallerScreen />));
    await abrirCobro(view);
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    expect(mockRegistrar).toHaveBeenCalledTimes(1);
    resolver({ id: 'ok', ancla_tipo: 'cita', ancla_id: '15' });
    await asentar();
    await waitFor(() => expect(view.queryByLabelText('Confirmar envío')).toBeNull());
  });

  it('la respuesta tardía del período anterior no pisa el período pedido', async () => {
    const pendientes: Array<(valor: LibroCaja) => void> = [];
    mockConsultar.mockReset();
    mockConsultar.mockImplementation(() => new Promise((resolve) => {
      pendientes.push(resolve);
    }));
    const view = await render(marco(<CajaTallerScreen />));
    await waitFor(() => expect(pendientes.length).toBeGreaterThan(0));
    const iniciales = pendientes.length;
    const desde = String(view.getByLabelText('Desde').props.value);
    const hastaInicial = String(view.getByLabelText('Hasta').props.value);
    await fireEvent.changeText(view.getByLabelText('Hasta'), '2026-11-20');
    await fireEvent.press(view.getByLabelText('Consultar período'));
    await waitFor(() => expect(pendientes.length).toBe(iniciales + 1));
    expect(view.getByText(`Cargando ${desde} a 2026-11-20`)).toBeTruthy();
    for (let i = 0; i < iniciales; i += 1) {
      pendientes[i](libroDe(desde, hastaInicial, 111));
    }
    await asentar();
    expect(view.queryByText(formatearMontoCLP(111))).toBeNull();
    pendientes[pendientes.length - 1](libroDe(desde, '2026-11-20', 222));
    await waitFor(() => expect(view.getAllByText(formatearMontoCLP(222)).length).toBeGreaterThan(0));
    expect(view.queryByText(formatearMontoCLP(111))).toBeNull();
    expect(view.queryByText(`Cargando ${desde} a 2026-11-20`)).toBeNull();
  });

  it('la devolución sale de la entrada manual y una fecha imposible no se envía', async () => {
    mockConsultar.mockImplementation(async (consulta: { desde: string; hasta: string }) => libroDe(
      consulta.desde,
      consulta.hasta,
      30,
      [
        movimiento({
          id: 'manual-30',
          origen: 'manual',
          fecha_efectiva: '2026-03-02T15:04:00-03:00',
        }),
        movimiento({ id: 'mp-30', origen: 'mp', monto_clp: 40 }),
      ],
    ));
    mockRegistrar.mockResolvedValue({ id: 'reverso-1', ancla_tipo: 'cita', ancla_id: '15' });
    const view = await render(marco(<CajaTallerScreen />));
    await waitFor(() => expect(view.getAllByText('Devolver este cobro')).toHaveLength(1));
    expect(view.getByText(/Mercado Pago/)).toBeTruthy();
    await fireEvent.press(view.getByText('Devolver este cobro'));
    await waitFor(() => expect(view.getByText(/Devolución del cobro del 2026-11-05/)).toBeTruthy());
    const hoy = fechaSantiago(new Date());
    const fecha = String(view.getByLabelText('Fecha efectiva').props.value);
    expect(fecha).toBe(hoy);
    expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fecha).not.toBe('2026-03-02');
    expect(fecha).not.toContain('T');
    expect(view.queryByLabelText('Movimiento de origen')).toBeNull();
    await fireEvent.press(view.getByText('Revisar'));
    await waitFor(() => expect(view.getByLabelText('Confirmar envío')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalled());
    expect(mockRegistrar.mock.calls[0][0].movimiento_origen_id).toBe('manual-30');
    expect(mockRegistrar.mock.calls[0][0].tipo).toBe('reembolso');
    expect(mockRegistrar.mock.calls[0][0].fecha_efectiva).toBe(hoy);

    mockRegistrar.mockClear();
    await waitFor(() => expect(view.queryByLabelText('Confirmar envío')).toBeNull());
    await fireEvent.press(view.getByLabelText('Registrar cobro'));
    await waitFor(() => expect(view.getByLabelText('Fecha efectiva')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('Id del caso'), '15');
    await fireEvent.changeText(view.getByLabelText('Monto en pesos'), '30');
    await fireEvent.changeText(view.getByLabelText('Fecha efectiva'), '2026-02-31');
    await fireEvent.press(view.getByText('Revisar'));
    await waitFor(() => expect(view.getByText(/no existe/i)).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('Fecha efectiva'), '2026-02-30T15:04:00');
    await fireEvent.press(view.getByText('Revisar'));
    await waitFor(() => expect(view.getByText(/no guarda/i)).toBeTruthy());
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('un 502 y un 504 conservan la clave y no abren la edición', async () => {
    mockRegistrar.mockRejectedValueOnce(falloDesdeRespuesta(502, {}));
    const view = await render(marco(<CajaTallerScreen />));
    await abrirCobro(view);
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(view.getByText(/no confirmó el resultado \(502\)/i)).toBeTruthy());
    expect(view.queryByText(/rechaz/i)).toBeNull();
    expect(view.queryByText(/no cambió/i)).toBeNull();
    await fireEvent.press(view.getByLabelText('Reintentar antes de editar'));
    expect(view.queryByLabelText('Motivo')).toBeNull();
    mockRegistrar.mockRejectedValueOnce(falloDesdeRespuesta(504, {}));
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(view.getByText(/no confirmó el resultado \(504\)/i)).toBeTruthy());
    expect(mockRegistrar).toHaveBeenCalledTimes(2);
    expect(mockRegistrar.mock.calls[1][0]).toEqual(mockRegistrar.mock.calls[0][0]);
    expect(mockRegistrar.mock.calls[1][1]).toBe(mockRegistrar.mock.calls[0][1]);
    expect(view.queryByLabelText('Motivo')).toBeNull();
  });

  it('un 400 definitivo deja corregir el cobro con otra clave', async () => {
    mockRegistrar.mockRejectedValueOnce(falloDesdeRespuesta(400, { code: 'fecha_invalida' }));
    const view = await render(marco(<CajaTallerScreen />));
    await abrirCobro(view);
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(view.getByText(/no guardó/i)).toBeTruthy());
    expect(view.queryByText(/no se sabe/i)).toBeNull();
    await fireEvent.press(view.getByLabelText('Volver a editar'));
    await waitFor(() => expect(view.getByLabelText('Motivo')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('Motivo'), 'corregido');
    await fireEvent.press(view.getByText('Revisar'));
    await waitFor(() => expect(view.getByLabelText('Confirmar envío')).toBeTruthy());
    mockRegistrar.mockResolvedValueOnce({ id: 'ok', ancla_tipo: 'cita', ancla_id: '15' });
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalledTimes(2));
    expect(mockRegistrar.mock.calls[1][1]).not.toBe(mockRegistrar.mock.calls[0][1]);
    expect(mockRegistrar.mock.calls[1][0].motivo).toBe('corregido');
  });

  it('el borrador de fechas no retitula la carga ni el dinero ya pedido', async () => {
    const pendientes: Array<(valor: LibroCaja) => void> = [];
    mockConsultar.mockReset();
    mockConsultar.mockImplementation(() => new Promise((resolve) => {
      pendientes.push(resolve);
    }));
    const view = await render(marco(<CajaTallerScreen />));
    await waitFor(() => expect(pendientes.length).toBeGreaterThan(0));
    const desde = String(view.getByLabelText('Desde').props.value);
    const hasta = String(view.getByLabelText('Hasta').props.value);
    await fireEvent.changeText(view.getByLabelText('Hasta'), '2026-12-01');
    await fireEvent.press(view.getByText('Día'));
    expect(view.getByText(`Cargando ${desde} a ${hasta}`)).toBeTruthy();
    expect(view.queryByText(`Cargando ${desde} a 2026-12-01`)).toBeNull();
    const enCurso = pendientes.length;
    for (let i = 0; i < enCurso; i += 1) {
      pendientes[i](libroDe(desde, hasta, 111));
    }
    await waitFor(() => expect(view.getByText(`Libro ${desde} a ${hasta}`)).toBeTruthy());
    expect(view.getAllByText(formatearMontoCLP(111)).length).toBeGreaterThan(0);
    expect(String(view.getByLabelText('Hasta').props.value)).toBe('2026-12-01');
    expect(view.queryByText(`Libro ${desde} a 2026-12-01`)).toBeNull();
    expect(view.queryByText(`Cargando ${desde} a 2026-12-01`)).toBeNull();
  });

  it('un GET 502 del mismo período conserva las cifras y no dice que fue rechazado', async () => {
    mockConsultar.mockImplementation(async (consulta: { desde: string; hasta: string }) => (
      libroDe(consulta.desde, consulta.hasta, 333)
    ));
    const view = await render(marco(<CajaTallerScreen />));
    await waitFor(() => expect(view.getAllByText(formatearMontoCLP(333)).length).toBeGreaterThan(0));
    const desde = String(view.getByLabelText('Desde').props.value);
    const hasta = String(view.getByLabelText('Hasta').props.value);
    mockConsultar.mockRejectedValueOnce(falloDesdeRespuesta(502, {}));
    await fireEvent.press(view.getByLabelText('Consultar período'));
    await waitFor(() => expect(view.getByText(/no confirmó el resultado \(502\)/i)).toBeTruthy());
    expect(view.getByText(`Libro ${desde} a ${hasta}`)).toBeTruthy();
    expect(view.getAllByText(formatearMontoCLP(333)).length).toBeGreaterThan(0);
    expect(view.getByText(/período ya cargado/i)).toBeTruthy();
    expect(view.queryByText(/rechaz/i)).toBeNull();
    expect(view.queryByText('No hay movimientos en este período.')).toBeNull();
  });

  it('un GET 502 de otro período no deja el dinero anterior bajo el pedido nuevo', async () => {
    mockConsultar.mockImplementation(async (consulta: { desde: string; hasta: string }) => (
      libroDe(consulta.desde, consulta.hasta, 333)
    ));
    const view = await render(marco(<CajaTallerScreen />));
    await waitFor(() => expect(view.getAllByText(formatearMontoCLP(333)).length).toBeGreaterThan(0));
    const desde = String(view.getByLabelText('Desde').props.value);
    const hasta = String(view.getByLabelText('Hasta').props.value);
    await fireEvent.changeText(view.getByLabelText('Hasta'), '2026-12-01');
    mockConsultar.mockRejectedValueOnce(falloDesdeRespuesta(504, {}));
    await fireEvent.press(view.getByLabelText('Consultar período'));
    await waitFor(() => expect(view.getByText(/no se muestran cifras de otro período/i)).toBeTruthy());
    expect(view.queryByText(formatearMontoCLP(333))).toBeNull();
    expect(view.queryByText(`Libro ${desde} a ${hasta}`)).toBeNull();
    expect(view.queryByText(/rechaz/i)).toBeNull();
    expect(view.queryByText('No hay movimientos en este período.')).toBeNull();
    expect(String(view.getByLabelText('Hasta').props.value)).toBe('2026-12-01');
  });

  it('un 502 de costo no se cuenta como cobro ni como rechazo', async () => {
    mockCosto.mockRejectedValueOnce(falloDesdeRespuesta(502, {}));
    const view = await render(marco(<CajaTallerScreen />));
    await waitFor(() => expect(view.getByText('No hay movimientos en este período.')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Registrar costo'));
    await waitFor(() => expect(view.getByLabelText('Id del caso')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('Id del caso'), '15');
    await fireEvent.changeText(view.getByLabelText('Monto en pesos'), '30');
    await fireEvent.press(view.getByText('Revisar'));
    await waitFor(() => expect(view.getByLabelText('Confirmar envío')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(view.getByText(/no se sabe si el costo quedó guardado/i)).toBeTruthy());
    expect(view.queryByText(/cobro quedó guardado/i)).toBeNull();
    expect(view.queryByText(/rechaz/i)).toBeNull();
    expect(mockCosto).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    expect(mockCosto).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByLabelText('Volver a editar'));
    await waitFor(() => expect(view.getByLabelText('Nota')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('Nota'), 'otro gasto');
    await fireEvent.press(view.getByText('Revisar'));
    await waitFor(() => expect(view.getByLabelText('Confirmar envío')).toBeTruthy());
    mockCosto.mockResolvedValueOnce({ id: 'costo-1' });
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(mockCosto).toHaveBeenCalledTimes(2));
    expect(mockCosto.mock.calls[1][0].nota).toBe('otro gasto');
  });

  it('cambiar de cuenta no muestra ni borra el intento de la cuenta anterior', async () => {
    (globalThis as { __cajaAuth?: AuthCaja }).__cajaAuth = {
      esMecanicoEquipo: false,
      usuario: { id: 7 },
      estadoProveedor: { proveedor_id: 3 },
    };
    let neto = 777;
    mockConsultar.mockImplementation(async (consulta: { desde: string; hasta: string }) => (
      libroDe(consulta.desde, consulta.hasta, neto)
    ));
    mockRegistrar.mockRejectedValue(falloDesdeRespuesta(502, {}));
    const view = await render(marco(<CajaTallerScreen />));
    await waitFor(() => expect(view.getAllByText(formatearMontoCLP(777)).length).toBeGreaterThan(0));
    await abrirCobro(view);
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(view.getByText(/no confirmó el resultado \(502\)/i)).toBeTruthy());
    const clave = mockRegistrar.mock.calls[0][1];
    expect(view.getByLabelText('Confirmar envío')).toBeTruthy();

    neto = 0;
    (globalThis as { __cajaAuth?: AuthCaja }).__cajaAuth = {
      esMecanicoEquipo: false,
      usuario: { id: 8 },
      estadoProveedor: { proveedor_id: 3 },
    };
    await view.rerender(marco(<CajaTallerScreen />));
    await waitFor(() => expect(view.queryByText(formatearMontoCLP(777))).toBeNull());
    expect(view.queryByLabelText('Confirmar envío')).toBeNull();
    expect(view.queryByText('Reintentar el mismo envío')).toBeNull();
    expect(leerIntentoIncierto(duenoCaja(7, 3))?.clave).toBe(clave);
    expect(leerIntentoIncierto(duenoCaja(8, 3))).toBeNull();
    expect(mockRegistrar).toHaveBeenCalledTimes(1);

    (globalThis as { __cajaAuth?: AuthCaja }).__cajaAuth = {
      esMecanicoEquipo: false,
      usuario: { id: 7 },
      estadoProveedor: { proveedor_id: 3 },
    };
    await view.rerender(marco(<CajaTallerScreen />));
    await waitFor(() => expect(view.getByText('Reintentar el mismo envío')).toBeTruthy());
    await fireEvent.press(view.getByText('Reintentar el mismo envío'));
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalledTimes(2));
    expect(mockRegistrar.mock.calls[1][1]).toBe(clave);
    expect(mockRegistrar.mock.calls[1][0]).toEqual(mockRegistrar.mock.calls[0][0]);
  });

  function usarCuenta(usuarioId: number, tallerId = 3) {
    (globalThis as { __cajaAuth?: AuthCaja }).__cajaAuth = {
      esMecanicoEquipo: false,
      usuario: { id: usuarioId },
      estadoProveedor: { proveedor_id: tallerId },
    };
  }

  async function mostrarCuenta(
    view: Awaited<ReturnType<typeof render>>,
    usuarioId: number,
  ) {
    usarCuenta(usuarioId);
    await view.rerender(marco(<CajaTallerScreen />));
  }

  async function enviarCosto(
    view: Awaited<ReturnType<typeof render>>,
    monto: string,
    nota: string,
  ) {
    await waitFor(() => expect(view.getByLabelText('Registrar costo')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Registrar costo'));
    await waitFor(() => expect(view.getByLabelText('Id del caso')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('Id del caso'), '15');
    await fireEvent.changeText(view.getByLabelText('Monto en pesos'), monto);
    await fireEvent.changeText(view.getByLabelText('Nota'), nota);
    await fireEvent.press(view.getByText('Revisar'));
    await waitFor(() => expect(view.getByLabelText('Confirmar envío')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
  }

  function montoVisible(monto: number) {
    return new RegExp(formatearMontoCLP(monto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }

  it('un 502 que llega después del cambio de cuenta no se pinta en la otra', async () => {
    let rechazar: (error: unknown) => void = () => {};
    mockRegistrar.mockImplementation(() => new Promise((_resolve, reject) => {
      rechazar = reject;
    }));
    usarCuenta(7);
    const view = await render(marco(<CajaTallerScreen />));
    await abrirCobro(view);
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalledTimes(1));
    const clave = mockRegistrar.mock.calls[0][1];
    const monto = new RegExp(formatearMontoCLP(30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    await mostrarCuenta(view, 8);
    await waitFor(() => expect(view.queryByLabelText('Confirmar envío')).toBeNull());
    expect(view.queryByText(monto)).toBeNull();
    expect(view.queryByText(/quedó sin respuesta/i)).toBeNull();

    await act(async () => {
      rechazar(falloDesdeRespuesta(502, {}));
    });
    await waitFor(() => expect(leerIntentoIncierto(duenoCaja(7, 3))?.clave).toBe(clave));
    expect(view.queryByText(/no confirmó el resultado \(502\)/i)).toBeNull();
    expect(view.queryByText(/quedó sin respuesta/i)).toBeNull();
    expect(view.queryByText(monto)).toBeNull();
    expect(view.queryByLabelText('Confirmar envío')).toBeNull();
    expect(leerIntentoIncierto(duenoCaja(8, 3))).toBeNull();

    await mostrarCuenta(view, 7);
    await waitFor(() => expect(view.getByText('Reintentar el mismo envío')).toBeTruthy());
    expect(view.getByText(monto)).toBeTruthy();
    await fireEvent.press(view.getByText('Reintentar el mismo envío'));
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalledTimes(2));
    expect(mockRegistrar.mock.calls[1][1]).toBe(clave);
    expect(mockRegistrar.mock.calls[1][0]).toEqual(mockRegistrar.mock.calls[0][0]);
  });

  it('un 502 de costo que llega en otra cuenta no se pinta allí', async () => {
    let rechazar: (error: unknown) => void = () => {};
    mockCosto.mockImplementation(() => new Promise((_resolve, reject) => {
      rechazar = reject;
    }));
    usarCuenta(7);
    const view = await render(marco(<CajaTallerScreen />));
    await waitFor(() => expect(view.getByText('No hay movimientos en este período.')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Registrar costo'));
    await waitFor(() => expect(view.getByLabelText('Id del caso')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('Id del caso'), '15');
    await fireEvent.changeText(view.getByLabelText('Monto en pesos'), '30');
    await fireEvent.press(view.getByText('Revisar'));
    await waitFor(() => expect(view.getByLabelText('Confirmar envío')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(mockCosto).toHaveBeenCalledTimes(1));

    await mostrarCuenta(view, 8);
    await waitFor(() => expect(view.queryByLabelText('Confirmar envío')).toBeNull());
    await act(async () => {
      rechazar(falloDesdeRespuesta(502, {}));
    });
    await asentar();
    expect(view.queryByText(/no se sabe si el costo quedó guardado/i)).toBeNull();
    expect(view.queryByText(/Un costo de/i)).toBeNull();
    expect(view.queryByLabelText('Confirmar envío')).toBeNull();
    expect(view.queryByText(new RegExp(formatearMontoCLP(30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeNull();

    await mostrarCuenta(view, 7);
    await waitFor(() => expect(view.getByText(/Un costo de/i)).toBeTruthy());
    expect(view.getByText(/no se sabe si el costo quedó guardado/i)).toBeTruthy();
    expect(view.getByText(new RegExp(formatearMontoCLP(30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy();
  });

  it('un 200, un 400 o un 409 que llegan en otra cuenta no se pintan', async () => {
    let asentarEnvio: { resolver: (valor: unknown) => void; rechazar: (error: unknown) => void } = {
      resolver: () => {},
      rechazar: () => {},
    };
    mockRegistrar.mockImplementation(() => new Promise((resolve, reject) => {
      asentarEnvio = { resolver: resolve, rechazar: reject };
    }));
    usarCuenta(7);
    const view = await render(marco(<CajaTallerScreen />));

    await abrirCobro(view);
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalledTimes(1));
    await mostrarCuenta(view, 8);
    await act(async () => {
      asentarEnvio.rechazar(falloDesdeRespuesta(400, { code: 'fecha_invalida' }));
    });
    await asentar();
    expect(view.queryByText(/no guardó/i)).toBeNull();
    expect(view.queryByLabelText('Confirmar envío')).toBeNull();
    expect(leerIntentoIncierto(duenoCaja(7, 3))).toBeNull();

    await mostrarCuenta(view, 7);
    await abrirCobro(view);
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalledTimes(2));
    await mostrarCuenta(view, 8);
    await act(async () => {
      asentarEnvio.rechazar(falloDesdeRespuesta(409, { code: 'reverso_ancla_distinta' }));
    });
    await asentar();
    expect(view.queryByText(/mismo caso/i)).toBeNull();
    expect(view.queryByText(/quedó sin respuesta/i)).toBeNull();

    await mostrarCuenta(view, 7);
    await abrirCobro(view);
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalledTimes(3));
    await mostrarCuenta(view, 8);
    await fireEvent.press(view.getByLabelText('Registrar cobro'));
    await waitFor(() => expect(view.getByLabelText('Id del caso')).toBeTruthy());
    await act(async () => {
      asentarEnvio.resolver({ id: 'ok', ancla_tipo: 'oferta', ancla_id: '9' });
    });
    await asentar();
    expect(view.getByLabelText('Id del caso')).toBeTruthy();
    expect(view.queryByText(/Oferta 9/)).toBeNull();
    expect(view.queryByText(/quedó sin respuesta/i)).toBeNull();
  });

  it('el 502 tardío de un costo no borra la protección de la otra cuenta', async () => {
    const pendientes: Array<{ rechazar: (error: unknown) => void }> = [];
    mockCosto.mockImplementation(() => new Promise((_resolve, reject) => {
      pendientes.push({ rechazar: reject });
    }));
    usarCuenta(7);
    const view = await render(marco(<CajaTallerScreen />));
    await waitFor(() => expect(view.getByText('No hay movimientos en este período.')).toBeTruthy());
    await enviarCosto(view, '30', 'alfa');
    await waitFor(() => expect(mockCosto).toHaveBeenCalledTimes(1));

    await mostrarCuenta(view, 8);
    await enviarCosto(view, '40', 'beta');
    await waitFor(() => expect(mockCosto).toHaveBeenCalledTimes(2));
    await act(async () => {
      pendientes[1].rechazar(falloDesdeRespuesta(502, {}));
    });
    await waitFor(() => expect(view.getByText(/no se sabe si el costo quedó guardado/i)).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    expect(mockCosto).toHaveBeenCalledTimes(2);

    await act(async () => {
      pendientes[0].rechazar(falloDesdeRespuesta(502, {}));
    });
    await asentar();
    expect(view.getAllByText(montoVisible(40)).length).toBeGreaterThan(0);
    expect(view.queryByText(montoVisible(30))).toBeNull();
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    expect(mockCosto).toHaveBeenCalledTimes(2);

    await mostrarCuenta(view, 7);
    await waitFor(() => expect(view.getAllByText(montoVisible(30)).length).toBeGreaterThan(0));
    expect(view.queryByText(montoVisible(40))).toBeNull();
    await enviarCosto(view, '30', 'alfa');
    expect(mockCosto).toHaveBeenCalledTimes(2);
  });

  it('un 200, un 400 o un 409 tardíos de costo no tocan el formulario de la otra cuenta', async () => {
    const pendientes: Array<{
      resolver: (valor: unknown) => void;
      rechazar: (error: unknown) => void;
    }> = [];
    mockCosto.mockImplementation(() => new Promise((resolve, reject) => {
      pendientes.push({ resolver: resolve, rechazar: reject });
    }));
    usarCuenta(7);
    const view = await render(marco(<CajaTallerScreen />));
    await waitFor(() => expect(view.getByText('No hay movimientos en este período.')).toBeTruthy());

    await enviarCosto(view, '30', 'alfa');
    await waitFor(() => expect(mockCosto).toHaveBeenCalledTimes(1));
    await mostrarCuenta(view, 8);
    await waitFor(() => expect(view.getByLabelText('Registrar costo')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Registrar costo'));
    await waitFor(() => expect(view.getByLabelText('Nota')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('Nota'), 'de-b');
    await act(async () => {
      pendientes[0].resolver({ id: 'costo-a' });
    });
    await asentar();
    expect(String(view.getByLabelText('Nota').props.value)).toBe('de-b');
    expect(view.queryByText(/Un costo de/i)).toBeNull();

    await mostrarCuenta(view, 7);
    await enviarCosto(view, '30', 'alfa');
    await waitFor(() => expect(mockCosto).toHaveBeenCalledTimes(2));
    await mostrarCuenta(view, 8);
    await fireEvent.press(view.getByLabelText('Registrar costo'));
    await waitFor(() => expect(view.getByLabelText('Nota')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('Id del caso'), '15');
    await fireEvent.changeText(view.getByLabelText('Monto en pesos'), '40');
    await fireEvent.changeText(view.getByLabelText('Nota'), 'de-b');
    await fireEvent.press(view.getByText('Revisar'));
    await waitFor(() => expect(view.getByLabelText('Confirmar envío')).toBeTruthy());
    await act(async () => {
      pendientes[1].rechazar(falloDesdeRespuesta(400, { code: 'fecha_invalida' }));
    });
    await asentar();
    expect(view.getByLabelText('Confirmar envío')).toBeTruthy();
    expect(view.queryByText(/no guardó/i)).toBeNull();

    await mostrarCuenta(view, 7);
    await enviarCosto(view, '30', 'alfa');
    await waitFor(() => expect(mockCosto).toHaveBeenCalledTimes(3));
    await mostrarCuenta(view, 8);
    await fireEvent.press(view.getByLabelText('Registrar costo'));
    await waitFor(() => expect(view.getByLabelText('Nota')).toBeTruthy());
    await fireEvent.changeText(view.getByLabelText('Nota'), 'de-b');
    await act(async () => {
      pendientes[2].rechazar(falloDesdeRespuesta(409, { code: 'reverso_ancla_distinta' }));
    });
    await asentar();
    expect(String(view.getByLabelText('Nota').props.value)).toBe('de-b');
    expect(view.queryByText(/mismo caso/i)).toBeNull();
  });

  it('un POST sin respuesta no se edita ni cambia de clave, tampoco al volver a montar', async () => {
    mockRegistrar.mockRejectedValue(new Error('timeout'));
    const view = await render(marco(<CajaTallerScreen />));
    await abrirCobro(view);
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(view.getByText(/no se sabe si/i)).toBeTruthy());
    expect(view.queryByText(/no cambió/i)).toBeNull();
    await fireEvent.press(view.getByLabelText('Reintentar antes de editar'));
    expect(view.queryByLabelText('Motivo')).toBeNull();

    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalledTimes(2));
    expect(mockRegistrar.mock.calls[1][0]).toEqual(mockRegistrar.mock.calls[0][0]);
    expect(mockRegistrar.mock.calls[1][1]).toBe(mockRegistrar.mock.calls[0][1]);
    const clave = mockRegistrar.mock.calls[0][1];

    await fireEvent.press(view.getByLabelText('Cerrar registro'));
    await waitFor(() => expect(view.getByText('Reintentar el mismo envío')).toBeTruthy());
    view.unmount();
    const otra = await render(marco(<CajaTallerScreen />));
    await waitFor(() => expect(otra.getByText('Reintentar el mismo envío')).toBeTruthy());
    await fireEvent.press(otra.getByText('Reintentar el mismo envío'));
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalledTimes(3));
    expect(mockRegistrar.mock.calls[2][1]).toBe(clave);
    expect(mockRegistrar.mock.calls[2][0]).toEqual(mockRegistrar.mock.calls[0][0]);
    await waitFor(() => expect(otra.getByText(/no se sabe si/i)).toBeTruthy());
    expect(otra.queryByLabelText('Motivo')).toBeNull();
    const guardado = JSON.parse(String(globalThis.sessionStorage?.getItem('mecanimovil.caja.intento-incierto')));
    expect(guardado['1\n1'].clave).toBe(clave);
  });

});

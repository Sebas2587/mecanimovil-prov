import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { guardarIntentoIncierto, type LibroCaja, type MovimientoCaja } from '@/utils/cajaTaller';

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

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ esMecanicoEquipo: false }),
}));

const mockConsultar = jest.fn();
const mockRegistrar = jest.fn();
jest.mock('@/services/cajaTallerService', () => ({
  consultarCaja: (...args: unknown[]) => mockConsultar(...args),
  registrarCobro: (...args: unknown[]) => mockRegistrar(...args),
  registrarCosto: jest.fn(),
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
    guardarIntentoIncierto(null);
    mockConsultar.mockReset();
    mockRegistrar.mockReset();
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
        movimiento({ id: 'manual-30', origen: 'manual' }),
        movimiento({ id: 'mp-30', origen: 'mp', monto_clp: 40 }),
      ],
    ));
    mockRegistrar.mockResolvedValue({ id: 'reverso-1', ancla_tipo: 'cita', ancla_id: '15' });
    const view = await render(marco(<CajaTallerScreen />));
    await waitFor(() => expect(view.getAllByText('Devolver este cobro')).toHaveLength(1));
    expect(view.getByText(/Mercado Pago/)).toBeTruthy();
    await fireEvent.press(view.getByText('Devolver este cobro'));
    await waitFor(() => expect(view.getByText(/Devolución del cobro del 2026-11-05/)).toBeTruthy());
    expect(view.queryByLabelText('Movimiento de origen')).toBeNull();
    await fireEvent.press(view.getByText('Revisar'));
    await waitFor(() => expect(view.getByLabelText('Confirmar envío')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Confirmar envío'));
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalled());
    expect(mockRegistrar.mock.calls[0][0].movimiento_origen_id).toBe('manual-30');
    expect(mockRegistrar.mock.calls[0][0].tipo).toBe('reembolso');

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
    const guardado = globalThis.sessionStorage?.getItem('mecanimovil.caja.intento-incierto');
    expect(JSON.parse(String(guardado)).clave).toBe(clave);
  });

});

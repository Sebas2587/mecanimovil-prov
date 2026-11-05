import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

const mockActualizar = jest.fn();
const mockEnviar = jest.fn();
jest.mock('@/services/cotizacionCanalService', () => {
  const actual = jest.requireActual('@/services/cotizacionCanalService');
  return {
    __esModule: true,
    ...actual,
    default: {
      ...actual.default,
      actualizar: (...args: unknown[]) => mockActualizar(...args),
      enviar: (...args: unknown[]) => mockEnviar(...args),
      marcarAceptada: jest.fn(),
      marcarPerdida: jest.fn(),
    },
  };
});

jest.mock('@/utils/platformAlert', () => ({
  showAlert: jest.fn(),
  showAlertButtons: jest.fn(),
  showConfirm: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('@/hooks/useProveedoresRepuestosQuery', () => ({
  useProveedoresRepuestosQuery: () => ({ data: [], isLoading: false }),
}));

import { ModalAjusteBorrador } from '@/components/home/ModalAjusteBorrador';
import { CotizacionIaEditor } from '@/components/chats/CotizacionIaEditor';
import { CotizacionesPendientesSection } from '@/components/home/CotizacionesPendientesSection';
import { CotizacionDetalleSheet } from '@/components/taller/CotizacionDetalleSheet';
import { CotizacionCanalBubble } from '@/components/chats/CotizacionCanalBubble';
import { showAlert } from '@/utils/platformAlert';

let mockDetalle: CotizacionCanal | null = null;
jest.mock('@/hooks/useCotizacionCanalDetalleQuery', () => ({
  useCotizacionCanalDetalleQuery: () => ({
    data: mockDetalle,
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
  COTIZACION_CANAL_DETALLE_QUERY_KEY: 'cotizacion-canal-detalle',
}));

const metricas = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function marco(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <SafeAreaProvider initialMetrics={metricas}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}

function cotizacion(parcial: Partial<CotizacionCanal> = {}): CotizacionCanal {
  return {
    id: 7,
    estado: 'borrador',
    modalidad: 'taller',
    vehiculo_marca: 'Kia',
    vehiculo_modelo: 'Rio',
    vehiculo_patente: 'ABCD12',
    vehiculo_cilindraje: '',
    vehiculo_vin: '',
    tipo_motor: '',
    tipo_motor_label: '',
    aviso_motor: '',
    servicio_nombre: 'Frenos',
    descripcion_problema: '',
    cliente_nombre: 'Ana',
    repuestos: [],
    mano_obra_clp: 0,
    costo_repuestos_clp: 0,
    total_clp: 0,
    ...parcial,
  } as CotizacionCanal;
}

describe('lista, detalle y editor no inventan $0', () => {
  beforeEach(() => {
    mockActualizar.mockReset();
    mockEnviar.mockReset();
    (showAlert as jest.Mock).mockReset();
    mockDetalle = null;
  });

  it('la burbuja muestra Incompleto, el cero y no convierte la línea faltante', async () => {
    const nulo = await render(<CotizacionCanalBubble totalClp={null} servicioNombre="Frenos" />);
    expect(nulo.getByText('Incompleto')).toBeTruthy();
    expect(nulo.queryByText('$0')).toBeNull();

    const cero = await render(<CotizacionCanalBubble totalClp={0} servicioNombre="Frenos" />);
    expect(cero.getByText('$0')).toBeTruthy();

    const linea = await render(
      <CotizacionCanalBubble
        totalClp={null}
        totalesCompletos={false}
        servicioNombre="Frenos"
        repuestos={[{ nombre: 'Sensor', cantidad: 1, precio_unitario_clp: null }]}
      />,
    );
    expect(linea.getByText(/Sensor ×1 · Incompleto/)).toBeTruthy();
  });

  it('el detalle no pinta $0 cuando el total o una línea vienen nulos', async () => {
    mockDetalle = cotizacion({
      total_clp: null as never,
      totales_completos: false,
      total_conocido_parcial_clp: 1000,
      repuestos: [{ id: 's', nombre: 'Sensor', cantidad: 1, precio_unitario_clp: null } as never],
    });
    const view = await render(marco(<CotizacionDetalleSheet cotizacionId={7} onClose={jest.fn()} />));
    expect(view.getAllByText('Incompleto').length).toBeGreaterThan(0);
    expect(view.queryByText('$0')).toBeNull();
    expect(view.getByText(/Suma parcial/)).toBeTruthy();
  });

  it('el detalle muestra el cero explícito', async () => {
    mockDetalle = cotizacion({
      total_clp: 0,
      totales_completos: true,
      repuestos: [{ id: 'c', nombre: 'Cortesía', cantidad: 1, precio_unitario_clp: 0 }],
    });
    const view = await render(marco(<CotizacionDetalleSheet cotizacionId={7} onClose={jest.fn()} />));
    expect(view.getAllByText('$0').length).toBeGreaterThan(0);
  });

  it('aprobar desde la lista no envía un total nulo y sí envía el cero', async () => {
    const incompleta = cotizacion({
      id: 8,
      total_clp: null as never,
      totales_completos: false,
      repuestos: [{ id: 's', nombre: 'Sensor', cantidad: 1, precio_unitario_clp: null } as never],
    });
    const lista = await render(
      marco(<CotizacionesPendientesSection cotizaciones={[incompleta]} onRefresh={jest.fn()} />),
    );
    expect(lista.getByText('Incompleto')).toBeTruthy();
    await act(async () => {
      fireEvent.press(lista.getByText('Aprobar y Enviar'));
    });
    expect(mockEnviar).not.toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith('Total incompleto', expect.stringMatching(/\$0/));

    const cero = cotizacion({
      id: 9,
      total_clp: 0,
      totales_completos: true,
      repuestos: [{ id: 'c', nombre: 'Cortesía', cantidad: 1, precio_unitario_clp: 0 }],
    });
    const listaCero = await render(
      marco(<CotizacionesPendientesSection cotizaciones={[cero]} onRefresh={jest.fn()} />),
    );
    await act(async () => {
      fireEvent.press(listaCero.getByText('Aprobar y Enviar'));
    });
    expect(mockEnviar).toHaveBeenCalledWith(9);
  });

  it('el editor de ajuste no guarda ni envía el faltante como cero', async () => {
    const incompleta = cotizacion({
      total_clp: null as never,
      totales_completos: false,
      repuestos: [{ id: 's', nombre: 'Sensor', cantidad: 1, precio_unitario_clp: null } as never],
    });
    const view = await render(marco(
      <ModalAjusteBorrador
        visible
        cotizacion={incompleta}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />,
    ));
    expect(view.getAllByText('Incompleto').length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.press(view.getByText(/Aprobar y Enviar/));
    });
    expect(mockActualizar).not.toHaveBeenCalled();
    expect(mockEnviar).not.toHaveBeenCalled();
  });

  it('el editor de ajuste sí envía el cero explícito', async () => {
    mockActualizar.mockResolvedValue(undefined);
    mockEnviar.mockResolvedValue(undefined);
    const cero = cotizacion({
      total_clp: 0,
      totales_completos: true,
      total_persistido_clp: 0,
      repuestos: [{ id: 'c', nombre: 'Cortesía', cantidad: 1, precio_unitario_clp: 0 }],
    });
    const view = await render(marco(
      <ModalAjusteBorrador
        visible
        cotizacion={cero}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />,
    ));
    await act(async () => {
      fireEvent.press(view.getByText(/Aprobar y Enviar/));
    });
    expect(mockActualizar).toHaveBeenCalledWith(7, expect.objectContaining({ total_clp: 0 }));
    expect(mockEnviar).toHaveBeenCalledWith(7);
  });

  it('el editor de la ficha no muestra $0 ni llama a enviar si falta un precio', async () => {
    const onEnviar = jest.fn();
    const incompleta = cotizacion({
      total_clp: 0,
      total_persistido_clp: 1000,
      repuestos: [
        { id: 'f', nombre: 'Filtro', cantidad: 1, precio_unitario_clp: 1000 },
        { id: 's', nombre: 'Sensor', cantidad: 1, precio_unitario_clp: null } as never,
      ],
    });
    const view = await render(marco(
      <CotizacionIaEditor cotizacion={incompleta} onChange={jest.fn()} onEnviar={onEnviar} />,
    ));
    expect(view.getByText('Total a pagar')).toBeTruthy();
    expect(view.getAllByText('Incompleto').length).toBeGreaterThan(0);
    expect(view.getByText(/Suma parcial/)).toBeTruthy();
    await act(async () => {
      fireEvent.press(view.getByText('Enviar cotización al cliente'));
    });
    expect(onEnviar).not.toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith('Total incompleto', expect.stringMatching(/\$0/));
    view.unmount();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
}));
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CajaLibro } from '@/components/caja/CajaLibro';
import { ETIQUETA_NETO, type LibroCaja, type MovimientoCaja } from '@/utils/cajaTaller';

const metricas = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function libro(parcial: Partial<LibroCaja> = {}): LibroCaja {
  return {
    zona: 'America/Santiago',
    desde: '2026-11-01',
    hasta: '2026-11-06',
    granularidad: 'dia',
    resumen: {
      cobros_brutos_clp: 30,
      reembolsos_clp: 10,
      neto_clp: 20,
      pendientes_no_sumados_clp: 0,
      moneda: 'CLP',
      completo: true,
      conocido_parcial: true,
      faltantes: [],
      legacy_no_contabilizado: 0,
    },
    serie: [{ inicio: '2026-11-05', fin: '2026-11-05', cobros_brutos_clp: 30, reembolsos_clp: 0, neto_clp: 30 }],
    movimientos: {
      count: 2,
      page: 1,
      page_size: 50,
      next: '/api/ordenes/caja/?page=2',
      previous: null,
      results: [],
    },
    casos: {
      count: 1,
      page: 1,
      page_size: 50,
      next: null,
      previous: null,
      results: [{
        ancla_tipo: 'cita',
        ancla_id: '15',
        monto_exigible_clp: 100,
        exigible_conocido: true,
        neto_acumulado_clp: 20,
        saldo_clp: 80,
        saldo_conocido: true,
        estado_pago: 'parcial',
        margen_real_clp: null,
      }],
    },
    ...parcial,
  };
}

function movimiento(parcial: Partial<MovimientoCaja> = {}): MovimientoCaja {
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

function renderLibro(props: Partial<React.ComponentProps<typeof CajaLibro>> = {}) {
  return render(
    <SafeAreaProvider initialMetrics={metricas}>
      <CajaLibro
        desde="2026-11-01"
        hasta="2026-11-06"
        granularidad="mes"
        onCambiarDesde={jest.fn()}
        onCambiarHasta={jest.fn()}
        onCambiarGranularidad={jest.fn()}
        onConsultar={jest.fn()}
        avisoPeriodo={null}
        cargando={false}
        fallo={null}
        libro={libro()}
        onPaginaMovimientos={jest.fn()}
        onPaginaCasos={jest.fn()}
        puedeRegistrar
        puedeCosto
        onRegistrarCobro={jest.fn()}
        onRegistrarCosto={jest.fn()}
        {...props}
      />
    </SafeAreaProvider>,
  );
}

describe('CajaLibro', () => {
  it('etiqueta el neto como cobros menos devoluciones y el margen nulo como incompleto', async () => {
    await renderLibro();
    expect(screen.getAllByText(ETIQUETA_NETO).length).toBeGreaterThan(0);
    expect(screen.getByText('Margen real incompleto')).toBeTruthy();
    expect(screen.getByText('Cita 15')).toBeTruthy();
    expect(screen.queryByText('100')).toBeNull();
    expect(screen.getByLabelText('Registrar cobro')).toBeTruthy();
  });

  it('lista los códigos faltantes y no inventa un cero de moneda', async () => {
    const base = libro({
      resumen: {
        ...libro().resumen,
        completo: false,
        faltantes: ['legacy_sin_movimiento'],
      },
    });
    await renderLibro({ libro: base });
    expect(screen.getByText('Faltan datos: fuente sin movimiento.')).toBeTruthy();
    expect(screen.queryByText(/otra moneda 0/)).toBeNull();
  });

  it('muestra el nombre que vino en la misma fila', async () => {
    const base = libro();
    const identidad = {
      cliente_nombre: 'Ana',
      vehiculo_patente: 'ABCD12',
      folio: 'MM-1',
    };
    base.casos.results[0] = { ...base.casos.results[0], ...identidad };
    base.movimientos = {
      count: 1,
      page: 1,
      page_size: 50,
      next: null,
      previous: null,
      results: [movimiento(identidad)],
    };
    await renderLibro({ libro: base });
    expect(screen.getAllByText('Ana · ABCD12 · MM-1')).toHaveLength(2);
    expect(screen.queryByText('Cita 15')).toBeNull();
    expect(screen.queryByText('Cliente')).toBeNull();
  });

  it('un dato null no inventa cliente y el contracargo no se devuelve a mano', async () => {
    const base = libro();
    base.casos.results = [];
    base.casos.count = 0;
    base.movimientos = {
      count: 2,
      page: 1,
      page_size: 50,
      next: null,
      previous: null,
      results: [
        movimiento({ cliente_nombre: null, vehiculo_patente: null, folio: null, origen: 'mp' }),
        movimiento({ id: 'cb-1', tipo: 'contracargo', origen: 'mp', monto_clp: 70 }),
      ],
    };
    await renderLibro({ libro: base });
    expect(screen.getAllByText('Cita 15').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cliente')).toBeNull();
    expect(screen.getByText(/Contracargo/)).toBeTruthy();
    expect(screen.getByText(/No se suma otro monto/)).toBeTruthy();
    expect(screen.queryByText('Devolver este cobro')).toBeNull();
  });

  it('el mecánico no ve las acciones de registro', async () => {
    await renderLibro({ puedeRegistrar: false, puedeCosto: false });
    expect(screen.queryByLabelText('Registrar cobro')).toBeNull();
    expect(screen.queryByLabelText('Registrar costo')).toBeNull();
  });

  it('un 404 no se dibuja como período vacío', async () => {
    await renderLibro({
      libro: null,
      fallo: {
        clase: 'api_ausente',
        status: 404,
        code: '',
        detail: '',
        mensaje: 'La caja no está publicada en el servidor. No es un período sin movimientos.',
      },
    });
    expect(screen.getByText(/no está publicada/i)).toBeTruthy();
    expect(screen.queryByText('No hay movimientos en este período.')).toBeNull();
  });

  it('un 200 vacío sí dice que no hay movimientos', async () => {
    await renderLibro({
      libro: libro({
        movimientos: { count: 0, page: 1, page_size: 50, next: null, previous: null, results: [] },
        casos: { count: 0, page: 1, page_size: 50, next: null, previous: null, results: [] },
        serie: [],
      }),
    });
    expect(screen.getByText('No hay movimientos en este período.')).toBeTruthy();
  });
});

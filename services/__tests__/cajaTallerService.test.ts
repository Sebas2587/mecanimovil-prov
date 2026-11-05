import { consultarCaja, registrarCobro } from '@/services/cajaTallerService';
import type { CuerpoCobro } from '@/utils/cajaTaller';

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const cuerpo: CuerpoCobro = {
  ancla_tipo: 'oferta',
  ancla_id: '9',
  tipo: 'reembolso',
  componente: 'total',
  monto_clp: 10,
  fecha_efectiva: '2026-11-06',
  movimiento_origen_id: 'mov-1',
  motivo: 'devolución',
  confirmar_sobrepago: false,
};

describe('cajaTallerService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('consulta el período y conserva el 404 como fallo, no como libro vacío', async () => {
    mockGet.mockRejectedValue({ response: { status: 404, data: {} } });
    await expect(consultarCaja({
      desde: '2026-11-01',
      hasta: '2026-11-05',
      granularidad: 'mes',
    })).rejects.toMatchObject({ clase: 'api_ausente' });
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/ordenes/caja/?desde=2026-11-01'));
  });

  it('envía la clave de idempotencia y no inventa otra si el llamador repite el cuerpo', async () => {
    mockPost.mockResolvedValue({ data: { id: 'mov-2', creado: true } });
    await registrarCobro(cuerpo, 'clave-1');
    await registrarCobro(cuerpo, 'clave-1');
    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenNthCalledWith(1, '/ordenes/caja/cobros/', cuerpo, {
      headers: { 'Idempotency-Key': 'clave-1' },
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/ordenes/caja/cobros/', cuerpo, {
      headers: { 'Idempotency-Key': 'clave-1' },
    });
  });

  it('un 409 queda visible y no dispara otro POST desde el servicio', async () => {
    mockPost.mockRejectedValue({
      response: { status: 409, data: { code: 'idempotencia_conflicto', detail: 'otro cuerpo' } },
    });
    await expect(registrarCobro(cuerpo, 'clave-1')).rejects.toMatchObject({
      clase: 'conflicto',
      code: 'idempotencia_conflicto',
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('trae el nombre del caso en el mismo GET y no pide cada ancla', async () => {
    mockGet.mockResolvedValue({
      data: {
        casos: {
          results: [{ cliente_nombre: 'Ana', vehiculo_patente: 'ABCD12', folio: 'MM-1' }],
        },
      },
    });
    const libro = await consultarCaja({
      desde: '2026-11-01',
      hasta: '2026-11-05',
      granularidad: 'mes',
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(libro.casos.results[0].cliente_nombre).toBe('Ana');
    expect(libro.casos.results[0].vehiculo_patente).toBe('ABCD12');
    expect(libro.casos.results[0].folio).toBe('MM-1');
  });
});

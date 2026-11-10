import { gateEnviarCotizacionTaller } from '@/utils/envioCotizacionTaller';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';

jest.mock('@/utils/platformAlert', () => ({
  showAlert: jest.fn(),
  showAlertButtons: jest.fn(),
}));

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
  estado_sugerencia: 'pendiente' as const,
  cantidad: 1,
  precio_unitario_clp: 12000,
};

describe('gateEnviarCotizacionTaller', () => {
  const continuar = jest.fn();

  beforeEach(() => {
    continuar.mockReset();
    (showAlert as jest.Mock).mockReset();
    (showAlertButtons as jest.Mock).mockReset();
  });

  it('bloquea si hay dudas y no abre el aviso de sugerencias', () => {
    gateEnviarCotizacionTaller({
      repuestos: [pedido, sugerido],
      dudas: [{ id: 'd1', texto: '¿Incluye el piloto?', confirmada: false }],
    }, continuar);
    expect(showAlert).toHaveBeenCalledWith('Falta tu opinión', expect.stringMatching(/duda/));
    expect(showAlertButtons).not.toHaveBeenCalled();
    expect(continuar).not.toHaveBeenCalled();
  });

  it('avisa con Revisar y Enviar igual si hay sugerencias pendientes', () => {
    gateEnviarCotizacionTaller({
      repuestos: [pedido, sugerido],
    }, continuar);
    expect(showAlert).not.toHaveBeenCalled();
    expect(continuar).not.toHaveBeenCalled();
    expect(showAlertButtons).toHaveBeenCalledWith(
      'Sugerencias sin decidir',
      'Tienes 1 sugerencia sin decidir. Se enviará sin ella.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Revisar', style: 'cancel' }),
        expect.objectContaining({ text: 'Enviar igual' }),
      ]),
    );
    const botones = (showAlertButtons as jest.Mock).mock.calls[0][2] as { text: string; onPress?: () => void }[];
    botones.find((b) => b.text === 'Enviar igual')?.onPress?.();
    expect(continuar).toHaveBeenCalledTimes(1);
  });

  it('bloquea las dudas nuevas de PR48 sin cambiar el flujo', () => {
    gateEnviarCotizacionTaller({
      repuestos: [pedido],
      metadata: {
        dudas: [
          { id: 'precio-estimado-sensor-de-detonacion', texto: 'El precio es estimado.', confirmada: false },
          { id: 'pieza-sensor-de-detonacion', texto: 'No clasifiqué la pieza.', confirmada: false },
          { id: 'precio-bomba-de-embrague', texto: 'Sin ficha propia de la bomba.', confirmada: false },
        ],
      },
    }, continuar);
    expect(showAlert).toHaveBeenCalledWith('Falta tu opinión', expect.stringMatching(/3 dudas/));
    expect(continuar).not.toHaveBeenCalled();
  });

  it('sigue de inmediato si no hay dudas ni sugerencias pendientes', () => {
    gateEnviarCotizacionTaller({ repuestos: [pedido] }, continuar);
    expect(showAlert).not.toHaveBeenCalled();
    expect(showAlertButtons).not.toHaveBeenCalled();
    expect(continuar).toHaveBeenCalledTimes(1);
  });
});

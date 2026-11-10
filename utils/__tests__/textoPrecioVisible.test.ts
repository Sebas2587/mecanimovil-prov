import { textoPrecioVisible } from '@/utils/textoPrecioVisible';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

describe('textoPrecioVisible', () => {
  it('formatea el monto cuando hay precio', () => {
    expect(textoPrecioVisible({ precio_unitario_clp: 89000 })).toBe(formatearMontoCLP(89000));
  });

  it('dice Estimado si el campo lo marca y no hay monto', () => {
    expect(textoPrecioVisible({ precio_estimado: true, precio_unitario_clp: 0 })).toBe('Estimado');
    expect(textoPrecioVisible({ estimada: true })).toBe('Estimado');
    expect(textoPrecioVisible({ certeza: 'asumido' })).toBe('Estimado');
  });

  it('dice Por confirmar si falta el precio y no es estimado', () => {
    expect(textoPrecioVisible({})).toBe('Por confirmar');
    expect(textoPrecioVisible({ precio_unitario_clp: null })).toBe('Por confirmar');
    expect(textoPrecioVisible({ precio_unitario_clp: 0 })).toBe('Por confirmar');
  });
});

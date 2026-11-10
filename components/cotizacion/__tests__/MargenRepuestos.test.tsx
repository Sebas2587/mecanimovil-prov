import React from 'react';
import { render } from '@testing-library/react-native';
import { MargenRepuestoLinea, ResumenMargenRepuestos } from '@/components/cotizacion/MargenRepuestos';

describe('MargenRepuestos no pinta $0 desde null', () => {
  it('la línea muestra Incompleto si el cobrado viene nulo', async () => {
    const view = await render(
      <MargenRepuestoLinea
        rep={{ cantidad: 1, precio_unitario_clp: null, costo_unitario_clp: null }}
      />,
    );
    expect(view.getAllByText(/Incompleto/).length).toBeGreaterThan(0);
    expect(view.getByText(/Costo final sin costo registrado/)).toBeTruthy();
    expect(view.queryByText('$0')).toBeNull();
  });

  it('marca Estimado la ganancia cuando el costo es estimado', async () => {
    const view = await render(
      <MargenRepuestoLinea
        rep={{
          cantidad: 1,
          precio_unitario_clp: 10000,
          costo_estimado_clp: 10000,
          precio_estimado: true,
          ganancia_estimada: true,
        }}
      />,
    );
    expect(view.getByText(/Ganancia/)).toBeTruthy();
    expect(view.getByText(/Estimado/)).toBeTruthy();
  });

  it('el cero explícito sí se ve en la línea', async () => {
    const view = await render(
      <MargenRepuestoLinea
        rep={{ cantidad: 1, precio_unitario_clp: 0, costo_unitario_clp: 0 }}
      />,
    );
    expect(view.getAllByText(/\$0/).length).toBeGreaterThan(0);
  });

  it('los totales no pintan $0 cuando falta el cobrado', async () => {
    const view = await render(
      <ResumenMargenRepuestos
        repuestos={[{ cantidad: 1, precio_unitario_clp: null, costo_unitario_clp: null }]}
      />,
    );
    expect(view.getAllByText('Incompleto').length).toBeGreaterThan(0);
    expect(view.getByText('sin costo registrado')).toBeTruthy();
    expect(view.queryByText('$0')).toBeNull();
  });
});

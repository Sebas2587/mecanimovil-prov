import React from 'react';
import { Text } from 'react-native';
import { render, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { CitaMasAcciones } from '@/components/agenda/CitaMasAcciones';

jest.mock('lucide-react-native', () => ({
  MoreHorizontal: () => null,
  X: () => null,
  ArrowLeft: () => null,
}));

const metricas = {
  frame: { x: 0, y: 0, width: 320, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const Icono = () => null;

const acciones = [
  {
    key: 'chat',
    label: 'Escribir al cliente',
    icon: Icono as never,
    onPress: jest.fn(),
  },
];

function Marco({ children }: { children: React.ReactNode }) {
  return <SafeAreaProvider initialMetrics={metricas}>{children}</SafeAreaProvider>;
}

describe('CitaMasAcciones', () => {
  it('en reposo está en la cabecera y no muestra el menú sobre el teléfono', async () => {
    const view = await render(
      <Marco>
        <Header title="#MM-000076" showBack rightComponent={<CitaMasAcciones actions={acciones} />} />
        <Text>56995192872</Text>
      </Marco>,
    );

    expect(view.getByLabelText('Más acciones')).toBeTruthy();
    expect(view.getByText('#MM-000076')).toBeTruthy();
    expect(view.getByText('56995192872')).toBeTruthy();
    expect(view.queryByText('Escribir al cliente')).toBeNull();
  });

  it('abre el menú desde la cabecera y ejecuta la acción', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Marco>
        <CitaMasAcciones actions={[{ ...acciones[0], onPress }]} />
      </Marco>,
    );
    const user = userEvent.setup();
    await user.press(view.getByLabelText('Más acciones'));
    await user.press(view.getByLabelText('Escribir al cliente'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(view.queryByText('Escribir al cliente')).toBeNull();
  });
});

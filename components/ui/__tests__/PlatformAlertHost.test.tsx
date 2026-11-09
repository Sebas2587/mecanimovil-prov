import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlatformAlertHost } from '@/components/ui/PlatformAlertHost';
import { showAlertButtons } from '@/utils/platformAlert';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  function MockModal({ visible, children }: { visible?: boolean; children?: React.ReactNode }) {
    if (visible === false) return null;
    return React.createElement(View, { testID: 'mock-modal' }, children);
  }
  return { __esModule: true, default: MockModal };
});

const metricas = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function renderHost() {
  return render(
    <SafeAreaProvider initialMetrics={metricas}>
      <PlatformAlertHost />
    </SafeAreaProvider>,
  );
}

describe('PlatformAlertHost cola de botones', () => {
  it('muestra el segundo diálogo después de pulsar Ahora no', async () => {
    const view = await renderHost();
    await act(async () => {
      jest.runAllTimers();
    });
    await act(async () => {
      showAlertButtons('Cotización enviada', 'El cliente puede abrir el link.', [
        { text: 'Copiar link' },
        { text: 'Ahora no', style: 'cancel' },
      ]);
    });
    await waitFor(() => expect(view.getByText('Cotización enviada')).toBeTruthy());
    fireEvent.press(view.getByLabelText('Ahora no'));

    await act(async () => {
      showAlertButtons('Trabajo extra enviado', 'Puedes copiar el link.', [
        { text: 'Copiar link' },
        { text: 'Ahora no', style: 'cancel' },
      ]);
    });
    await waitFor(() => expect(view.getByText('Trabajo extra enviado')).toBeTruthy());
    expect(view.getByLabelText('Ahora no')).toBeTruthy();
  });
});

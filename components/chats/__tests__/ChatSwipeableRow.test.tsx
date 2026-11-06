import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ChatSwipeableRow } from '@/components/chats/ChatSwipeableRow';

jest.mock('lucide-react-native', () => ({ Trash2: () => null }));
jest.mock('react-native-gesture-handler', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return {
    Swipeable: ({
      children,
      renderRightActions,
    }: {
      children: React.ReactNode;
      renderRightActions?: (progress: { interpolate: () => number }, drag: { interpolate: () => number }) => React.ReactNode;
    }) => ReactLib.createElement(
      View,
      null,
      renderRightActions?.({ interpolate: () => 0 }, { interpolate: () => 0 }),
      children,
    ),
  };
});

describe('eliminar conversación', () => {
  it('no borra al abrir la fila ni al cancelar', async () => {
    const onDelete = jest.fn();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(
      <ChatSwipeableRow rowKey="chat-1" onDelete={onDelete}>
        {null}
      </ChatSwipeableRow>,
    );
    expect(onDelete).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Eliminar conversación'));
    const botones = alert.mock.calls[0]?.[2] as Array<{ style?: string; onPress?: () => void }> | undefined;
    botones?.find((boton) => boton.style === 'cancel')?.onPress?.();
    expect(onDelete).not.toHaveBeenCalled();
    await Promise.resolve(botones?.find((boton) => boton.style === 'destructive')?.onPress?.());
    expect(onDelete).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });
});

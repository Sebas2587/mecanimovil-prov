import React from 'react';
import { Text } from 'react-native';
import { act, render, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { CitaMasAcciones } from '@/components/agenda/CitaMasAcciones';

jest.mock('lucide-react-native', () => ({
  MoreHorizontal: () => null,
  X: () => null,
  ArrowLeft: () => null,
}));

/**
 * `userEvent.press` no manda coordenadas ni recorre el hit-test nativo.
 * No demuestra que un hijo dibujado fuera del padre reciba el toque.
 * Aquí solo se afirma que las opciones son hijas del Modal a pantalla completa.
 */

const metricas = {
  frame: { x: 0, y: 0, width: 320, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const Icono = () => null;

function accion(onPress: () => void, extra?: { disabled?: boolean; label?: string }) {
  return {
    key: extra?.label ?? 'chat',
    label: extra?.label ?? 'Escribir al cliente',
    icon: Icono as never,
    onPress,
    disabled: extra?.disabled,
  };
}

function Marco({ children }: { children: React.ReactNode }) {
  return <SafeAreaProvider initialMetrics={metricas}>{children}</SafeAreaProvider>;
}

type Nodo = {
  type: string;
  props: Record<string, unknown>;
  parent: Nodo | null;
  queryAll: (predicado: (nodo: Nodo) => boolean) => Nodo[];
};

function modalDe(view: { root: Nodo | null }) {
  if (!view.root) throw new Error('sin árbol');
  const encontrados = view.root.queryAll((nodo) => nodo.type === 'Modal');
  expect(encontrados).toHaveLength(1);
  return encontrados[0];
}

function esDescendiente(hijo: Nodo, ancestro: Nodo) {
  let actual: Nodo | null = hijo;
  while (actual) {
    if (actual === ancestro) return true;
    actual = actual.parent;
  }
  return false;
}

describe('CitaMasAcciones', () => {
  it('en reposo está en la cabecera y no muestra el menú sobre el teléfono', async () => {
    const view = await render(
      <Marco>
        <Header title="#MM-000076" showBack rightComponent={<CitaMasAcciones actions={[accion(jest.fn())]} />} />
        <Text>56995192872</Text>
      </Marco>,
    );

    expect(view.getByLabelText('Más acciones')).toBeTruthy();
    expect(view.getByText('#MM-000076')).toBeTruthy();
    expect(view.getByText('56995192872')).toBeTruthy();
    expect(view.queryByText('Escribir al cliente')).toBeNull();
    expect(view.queryByLabelText('Cerrar menú')).toBeNull();
  });

  it('la opción vive en el Modal y no se dispara al abrirlo', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Marco>
        <CitaMasAcciones actions={[accion(onPress)]} />
      </Marco>,
    );
    const user = userEvent.setup();
    await user.press(view.getByLabelText('Más acciones'));
    expect(onPress).not.toHaveBeenCalled();

    const modal = modalDe(view);
    expect(modal.props.visible).toBe(true);
    const opcion = modal.queryAll((nodo) => nodo.props.accessibilityLabel === 'Escribir al cliente');
    expect(opcion).toHaveLength(1);
    expect(modal.queryAll((nodo) => nodo.props.accessibilityRole === 'menu')).toHaveLength(1);
    if (!view.root) throw new Error('sin árbol');
    const boton = view.root.queryAll((nodo) => nodo.props.accessibilityLabel === 'Más acciones')[0];
    if (!boton) throw new Error('sin botón');
    expect(esDescendiente(opcion[0], boton)).toBe(false);

    await user.press(view.getByLabelText('Escribir al cliente'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(view.queryByLabelText('Escribir al cliente')).toBeNull();
    expect(view.queryByLabelText('Cerrar menú')).toBeNull();
  });

  it('cerrar por fondo o atrás no ejecuta la acción', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Marco>
        <CitaMasAcciones actions={[accion(onPress)]} />
      </Marco>,
    );
    const user = userEvent.setup();
    await user.press(view.getByLabelText('Más acciones'));
    await user.press(view.getByLabelText('Cerrar menú'));
    expect(onPress).not.toHaveBeenCalled();
    expect(view.queryByLabelText('Cerrar menú')).toBeNull();

    await user.press(view.getByLabelText('Más acciones'));
    const atras = modalDe(view).props.onRequestClose;
    if (typeof atras !== 'function') throw new Error('sin atrás');
    await act(async () => {
      atras();
    });
    expect(onPress).not.toHaveBeenCalled();
    expect(view.queryByLabelText('Escribir al cliente')).toBeNull();
  });

  it('una opción deshabilitada no llama su callback', async () => {
    const habilitada = jest.fn();
    const bloqueada = jest.fn();
    const view = await render(
      <Marco>
        <CitaMasAcciones
          actions={[
            accion(habilitada),
            accion(bloqueada, { label: 'Asignar técnico', disabled: true }),
          ]}
        />
      </Marco>,
    );
    const user = userEvent.setup();
    await user.press(view.getByLabelText('Más acciones'));
    await user.press(view.getByLabelText('Asignar técnico'));
    expect(bloqueada).not.toHaveBeenCalled();
    expect(habilitada).not.toHaveBeenCalled();
    expect(modalDe(view).props.visible).toBe(true);
  });
});

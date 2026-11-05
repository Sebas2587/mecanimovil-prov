import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { MoreHorizontal, X } from 'lucide-react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { BORDERS, COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';
import type { CotizacionFabAction } from '@/components/cotizacion/CotizacionEditorFab';

const I = COLORS.institutional;

type Props = {
  actions: CotizacionFabAction[];
};

type NodoEnfocable = { focus?: () => void };

/**
 * El toque nativo usa el rectángulo del padre. zIndex no lo agranda.
 * El menú es flujo dentro del Modal, no un absolute que sale del botón.
 */
function enfocar(nodo: View | null) {
  if (!nodo) return;
  const conFoco = nodo as unknown as NodoEnfocable;
  if (typeof conFoco.focus === 'function') {
    conFoco.focus();
    return;
  }
  const handle = findNodeHandle(nodo);
  if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
}

export function CitaMasAcciones({ actions }: Props) {
  const [abierto, setAbierto] = useState(false);
  const botonRef = useRef<View>(null);
  const menuRef = useRef<View>(null);
  const estuvoAbierto = useRef(false);

  useEffect(() => {
    if (abierto) {
      estuvoAbierto.current = true;
      const id = requestAnimationFrame(() => enfocar(menuRef.current));
      return () => cancelAnimationFrame(id);
    }
    if (!estuvoAbierto.current) return;
    estuvoAbierto.current = false;
    const id = requestAnimationFrame(() => enfocar(botonRef.current));
    return () => cancelAnimationFrame(id);
  }, [abierto]);

  useEffect(() => {
    if (!abierto || Platform.OS !== 'web') return;
    const documento = (globalThis as { document?: DocumentLike }).document;
    if (!documento) return;
    const alTeclado = (event: { key?: string; preventDefault?: () => void }) => {
      if (event.key !== 'Escape') return;
      event.preventDefault?.();
      setAbierto(false);
    };
    documento.addEventListener('keydown', alTeclado);
    return () => documento.removeEventListener('keydown', alTeclado);
  }, [abierto]);

  if (actions.length === 0) return null;

  const cerrar = () => setAbierto(false);

  return (
    <View style={styles.ancla} collapsable={false}>
      <Pressable
        ref={botonRef}
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel="Más acciones"
        accessibilityState={{ expanded: abierto }}
        hitSlop={8}
        style={styles.boton}
      >
        {abierto ? (
          <X size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <MoreHorizontal size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </Pressable>
      <Modal
        visible={abierto}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={cerrar}
      >
        <View style={styles.capa}>
          <Pressable
            onPress={cerrar}
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Cerrar menú"
          />
          <View
            ref={menuRef}
            collapsable={false}
            accessible
            focusable
            accessibilityRole="menu"
            accessibilityLabel="Acciones de la cita"
            style={styles.menu}
            {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})}
          >
            {actions.map((action) => (
              <Pressable
                key={action.key}
                disabled={action.disabled}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityState={{ disabled: Boolean(action.disabled) }}
                onPress={() => {
                  if (action.disabled) return;
                  setAbierto(false);
                  action.onPress();
                }}
                style={styles.item}
              >
                <InstitutionalText role="body">{action.label}</InstitutionalText>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

type DocumentLike = {
  addEventListener: (type: string, listener: (event: { key?: string; preventDefault?: () => void }) => void) => void;
  removeEventListener: (type: string, listener: (event: { key?: string; preventDefault?: () => void }) => void) => void;
};

const styles = StyleSheet.create({
  ancla: {
    alignItems: 'flex-end',
  },
  boton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** La capa llena el Modal. El menú cabe en ese rectángulo, no en el botón. */
  capa: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  menu: {
    alignSelf: 'flex-end',
    marginTop: SPACING.fixed.sm,
    marginRight: SPACING.fixed.md,
    minWidth: 220,
    maxWidth: '92%',
    backgroundColor: I.paper,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    ...SHADOWS.editorial,
  },
  item: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.fixed.md,
  },
});

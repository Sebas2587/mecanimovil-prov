import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import {
  CotizacionIaProgreso,
  type FaseCotizacionIa,
} from '@/components/chats/CotizacionIaProgreso';
import type { ProgresoBusquedaWeb } from '@/services/cotizacionCanalService';

const C = COLORS;

type Props = {
  visible: boolean;
  fase: FaseCotizacionIa;
  progreso?: ProgresoBusquedaWeb | null;
};

/** Ventana flotante con el mismo riel de casas/precios que al generar la cotización. */
export function CotizacionIaBusquedaOverlay({ visible, fase, progreso }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => undefined}
    >
      <View style={styles.overlay} pointerEvents="auto">
        <View
          style={[
            styles.card,
            {
              paddingBottom: Math.max(insets.bottom, SPACING.fixed.lg),
              maxHeight: '86%',
            },
          ]}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollInner}
          >
            <CotizacionIaProgreso
              fase={fase === 'listo' ? 'listo' : 'precios'}
              progreso={progreso}
              variante="repuestos"
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.background.overlay,
    justifyContent: 'center',
    paddingHorizontal: SPACING.fixed.lg,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: C.background.paper,
    borderRadius: BORDERS.radius.modal.xl,
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.md,
    overflow: 'hidden',
  },
  scrollInner: {
    paddingBottom: SPACING.fixed.sm,
  },
});

export default CotizacionIaBusquedaOverlay;

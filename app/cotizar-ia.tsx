import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import Header from '@/components/Header';
import { CotizacionesIaList } from '@/components/chats/CotizacionesIaList';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/app/design-system/tokens';
import { hostScreenStyles } from '@/app/design-system/components';

/**
 * Cotizar con IA — Modal RN a pantalla completa (slide desde abajo).
 * La ruta usa transparentModal para que Hoy quede detrás mientras sube el sheet.
 */
export default function CotizarIaScreen() {
  const { estadoProveedor } = useAuth();
  const cuentaAprobada = estadoProveedor?.estado_verificacion === 'aprobado';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Montar primero la ruta transparente; luego abrir el Modal para animar el slide-up.
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    // Esperar la animación de cierre del Modal antes de quitar la ruta.
    const delay = Platform.OS === 'web' ? 220 : 280;
    setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace('/(tabs)');
    }, delay);
  }, []);

  return (
    <View style={styles.routeRoot}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'none',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleClose}
      >
        <View style={[hostScreenStyles.scroll, styles.screen]}>
          <Header title="Cotizar con IA" showBack onBackPress={handleClose} />
          <CotizacionesIaList enabled={cuentaAprobada} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  routeRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
});

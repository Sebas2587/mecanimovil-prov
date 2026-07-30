import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import Header from '@/components/Header';
import { CotizacionesIaList } from '@/components/chats/CotizacionesIaList';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/app/design-system/tokens';

export default function CotizarIaScreen() {
  const { estadoProveedor } = useAuth();
  const cuentaAprobada = estadoProveedor ? estadoProveedor.estado_verificacion === 'aprobado' : true;

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)' as never);
  }, []);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <Header title="Cotizar con IA" showBack onBackPress={handleClose} />
      <CotizacionesIaList enabled={cuentaAprobada} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
});

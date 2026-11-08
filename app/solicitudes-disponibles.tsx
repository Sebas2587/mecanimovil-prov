import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SolicitudesDisponiblesContent } from '@/components/solicitudes/SolicitudesDisponiblesContent';
import { COLORS } from '@/app/design-system/tokens';
import { AppHeader, hostScreenStyles } from '@/app/design-system/components';

/** Listado de solicitudes — canvas Host (sin gradient/glass). */
export default function SolicitudesDisponiblesScreen() {
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, title: 'Solicitudes disponibles' }} />
      <SafeAreaView style={[hostScreenStyles.scroll, styles.safe]} edges={['top']}>
        <AppHeader
          title="Solicitudes disponibles"
          showBack
          onBackPress={() => router.back()}
          dense
        />
        <SolicitudesDisponiblesContent variant="screen" />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  safe: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
});

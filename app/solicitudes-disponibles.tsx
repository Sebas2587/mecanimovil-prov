import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SolicitudesDisponiblesContent } from '@/components/solicitudes/SolicitudesDisponiblesContent';
import { COLORS } from '@/app/design-system/tokens';
import { hostScreenStyles } from '@/app/design-system/components';

const I = COLORS.institutional;

/** Listado de solicitudes — canvas Host (sin gradient/glass). */
export default function SolicitudesDisponiblesScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={[hostScreenStyles.scroll, styles.safe]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Solicitudes disponibles',
            headerBackTitle: '',
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: COLORS.background.default,
            },
            headerTintColor: I.ink,
            headerTitleStyle: {
              fontWeight: '600',
              fontSize: 17,
              color: I.ink,
            },
          }}
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

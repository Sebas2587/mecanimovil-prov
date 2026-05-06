import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Header from '@/components/Header';
import { RendimientoKpisContent } from '@/app/components/rendimiento';
import { COLORS } from '@/app/design-system/tokens';

const I = COLORS.institutional;

/**
 * Pantalla de detalle de KPIs del proveedor (marketplace / rendimiento).
 * Fondo y header alineados a DESIGN_PROVEEDORES_INSTITUCIONAL / index.
 */
export default function RendimientoKpisScreen() {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: I.surfaceSoft }]} edges={['left', 'right', 'bottom']}>
      <Header
        title="Tu rendimiento"
        showBack
        onBackPress={() => router.back()}
        backgroundColor={I.canvas}
        titleColor={I.ink}
      />
      <View style={styles.flex}>
        <RendimientoKpisContent />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Header from '@/components/Header';
import { RendimientoKpisContent } from '@/app/components/rendimiento';

/**
 * Pantalla de detalle de KPIs del proveedor (marketplace / rendimiento).
 * Fondo coherente con el gradiente del contenido (mismo tono inicial que index).
 */
export default function RendimientoKpisScreen() {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: '#F3F5F8' }]} edges={['left', 'right', 'bottom']}>
      <Header title="Tu rendimiento" showBack onBackPress={() => router.back()} />
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

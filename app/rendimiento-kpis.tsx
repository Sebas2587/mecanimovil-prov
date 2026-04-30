import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Header from '@/components/Header';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS } from '@/app/design-system/tokens';
import { RendimientoKpisContent } from '@/app/components/rendimiento';

/**
 * Pantalla de detalle de KPIs del proveedor (marketplace / rendimiento).
 * Diseño alineado al sistema de tokens y Header compartido.
 */
export default function RendimientoKpisScreen() {
  const theme = useTheme();
  const bg = theme?.colors?.background?.default ?? COLORS.neutral?.gray?.[50] ?? '#F8FAFC';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['left', 'right', 'bottom']}>
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

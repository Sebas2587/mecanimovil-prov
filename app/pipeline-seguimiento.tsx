import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/app/design-system/tokens';

const I = COLORS.institutional;

/**
 * Compat: rutas antiguas /pipeline-seguimiento redirigen al tab Bandeja.
 */
export default function PipelineSeguimientoRedirect() {
  const params = useLocalSearchParams<{ filtro?: string; origen?: string }>();

  useEffect(() => {
    const q = new URLSearchParams();
    if (params.filtro) q.set('filtro', String(params.filtro));
    if (params.origen) q.set('origen', String(params.origen));
    const qs = q.toString();
    router.replace(`/(tabs)/bandeja${qs ? `?${qs}` : ''}`);
  }, [params.filtro, params.origen]);

  return (
    <View style={styles.wrap}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator color={I.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceSoft,
  },
});

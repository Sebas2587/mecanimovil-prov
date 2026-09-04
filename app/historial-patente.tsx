import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { hostScreenStyles } from '@/app/design-system/components';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { HistorialRedContenido } from '@/components/vehiculos/HistorialRedContenido';
import { compactarPatente } from '@/services/vehiculoService';

const I = COLORS.institutional;

export default function HistorialPatenteScreen() {
  const raw = useLocalSearchParams<{ patente?: string | string[] }>().patente;
  const patente = compactarPatente(Array.isArray(raw) ? raw[0] : raw || '');
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title={patente || 'Historial de la patente'}
        backgroundColor={I.canvas}
        titleColor={I.ink}
        showBack
        onBackPress={() => router.back()}
      />
      <ScrollView
        style={hostScreenStyles.scroll}
        contentContainerStyle={[
          hostScreenStyles.scrollInner,
          { paddingBottom: insets.bottom + SPACING.fixed['2xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HistorialRedContenido patente={patente} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: I.canvas },
});

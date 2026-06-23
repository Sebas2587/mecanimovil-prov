import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { obtenerDetalleOferta } from '@/services/solicitudesService';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

/**
 * Redirect delgado: resuelve solicitud_id desde oferta_id y unifica en solicitud-detalle.
 */
export default function OfertaDetalleRedirectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isFirstFocus = useRef(true);

  const redirect = useCallback(async () => {
    if (!id) {
      router.back();
      return;
    }
    try {
      const result = await obtenerDetalleOferta(id);
      if (result.success && result.data?.solicitud) {
        router.replace(`/solicitud-detalle/${result.data.solicitud}`);
        return;
      }
      showAlert('Error', result.error || 'No se pudo cargar la oferta');
      router.back();
    } catch {
      showAlert('Error', 'No se pudo cargar la oferta');
      router.back();
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void redirect();
      isFirstFocus.current = false;
    }, [id, redirect]),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Detalle de solicitud',
          headerStyle: { backgroundColor: I.canvas },
          headerTintColor: I.ink,
        }}
      />
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={I.primary} />
        <Text style={styles.loadingText}>Cargando solicitud…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.fixed.sm,
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    color: I.ink,
  },
});

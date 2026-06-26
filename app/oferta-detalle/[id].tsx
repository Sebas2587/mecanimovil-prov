import React, { useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { obtenerDetalleOferta, type OfertaProveedor } from '@/services/solicitudesService';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { showAlert } from '@/utils/platformAlert';
import { openSolicitudDetalle } from '@/utils/navigateProveedorDetalle';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

/**
 * Redirect delgado: resuelve solicitud_id desde oferta_id y unifica en solicitud-detalle.
 * Usa caché de ofertas-proveedor cuando está disponible para evitar doble pantalla de carga.
 */
export default function OfertaDetalleRedirectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const redirect = useCallback(async () => {
    if (!id) {
      router.back();
      return;
    }

    const cachedOfertas = queryClient.getQueryData<OfertaProveedor[]>(['ofertas-proveedor']);
    const cached = cachedOfertas?.find((o) => String(o.id) === String(id));
    if (cached?.solicitud) {
      openSolicitudDetalle(router, queryClient, cached.solicitud, { oferta: cached }, { replace: true });
      return;
    }

    try {
      const result = await obtenerDetalleOferta(id);
      if (result.success && result.data?.solicitud) {
        openSolicitudDetalle(router, queryClient, result.data.solicitud, { oferta: result.data }, { replace: true });
        return;
      }
      showAlert('Error', result.error || 'No se pudo cargar la oferta');
      router.back();
    } catch {
      showAlert('Error', 'No se pudo cargar la oferta');
      router.back();
    }
  }, [id, queryClient]);

  React.useEffect(() => {
    void redirect();
  }, [redirect]);

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

const styles = {
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    marginTop: SPACING.fixed.sm,
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    color: I.ink,
  },
};

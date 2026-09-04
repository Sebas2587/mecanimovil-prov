import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Tags } from 'lucide-react-native';
import Header from '@/components/Header';
import {
  Card,
  HostEmptyState,
  HostSectionKicker,
  InstitutionalText,
  hostScreenStyles,
} from '@/app/design-system/components';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { institutionalInputPlaceholder, institutionalInputStyles } from '@/app/design-system/styles/institutionalInputs';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import {
  useEliminarPrecioPropioMutation,
  useMisPreciosRepuestosQuery,
} from '@/hooks/useProveedoresRepuestosQuery';

const I = COLORS.institutional;

export default function MisPreciosRepuestosScreen() {
  const [q, setQ] = useState('');
  const { data = [], isPending, isRefetching, refetch } = useMisPreciosRepuestosQuery(q);
  const eliminar = useEliminarPrecioPropioMutation();

  const quitar = useCallback((id: number, nombre: string) => {
    showConfirm('Quitar precio', `¿Eliminar el precio de "${nombre}"?`, {
      confirmText: 'Eliminar',
      onConfirm: () => {
        eliminar.mutate(id, {
          onError: () => showAlert('No se pudo eliminar', 'Intenta de nuevo.'),
        });
      },
    });
  }, [eliminar]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Mis precios" showBack onBackPress={() => router.back()} />

      {isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator color={I.primary} />
        </View>
      ) : (
        <ScrollView
          style={hostScreenStyles.scroll}
          contentContainerStyle={[hostScreenStyles.scrollInner, styles.listInner]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
          }
        >
          <HostSectionKicker label="Lo que pagaste" />
          <TextInput
            style={institutionalInputStyles.input}
            value={q}
            onChangeText={setQ}
            placeholder="Buscar pieza, marca o vehículo"
            placeholderTextColor={institutionalInputPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {data.length === 0 ? (
            <HostEmptyState
              icon={Tags}
              title="Sin precios propios"
              description="Cuando confirmas un precio o registras una compra, aparece aquí. La próxima cotización de esa pieza usa tu número, no internet."
            />
          ) : (
            <View style={styles.list}>
              {data.map((p) => (
                <Card key={p.id} elevated padding="host" style={styles.card}>
                  <InstitutionalText role="h5">{p.nombre_repuesto}</InstitutionalText>
                  <InstitutionalText role="caption" color="muted">
                    {[p.especificacion, p.marca_repuesto, p.proveedor_nombre]
                      .filter(Boolean)
                      .join(' · ')}
                  </InstitutionalText>
                  <InstitutionalText role="numberDisplay">
                    {formatearMontoCLP(p.precio_clp)}
                  </InstitutionalText>
                  <InstitutionalText role="caption" color="muted">
                    {[p.vehiculo_marca, p.vehiculo_modelo, p.vehiculo_anio].filter(Boolean).join(' ')}
                  </InstitutionalText>
                  <View style={styles.chips}>
                    {p.vigente === false ? (
                      <InstitutionalTag label="Vencido" variant="warning" size="sm" />
                    ) : (
                      <InstitutionalTag label="Vigente" variant="success" size="sm" />
                    )}
                    {p.origen ? (
                      <InstitutionalTag label={p.origen} variant="neutral" size="sm" />
                    ) : null}
                  </View>
                  <InstitutionalButton
                    label="Quitar"
                    variant="tertiary"
                    size="compact"
                    onPress={() => quitar(p.id, p.nombre_repuesto)}
                  />
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: I.surfaceSoft },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listInner: { gap: SPACING.fixed.md, paddingBottom: SPACING.fixed.xl },
  list: { gap: SPACING.fixed.sm },
  card: { gap: SPACING.fixed.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.fixed.xs },
});

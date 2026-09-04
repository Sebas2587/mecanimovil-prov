import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Store } from 'lucide-react-native';
import Header from '@/components/Header';
import {
  Card,
  HostEmptyState,
  HostSectionKicker,
  InstitutionalText,
  hostScreenStyles,
} from '@/app/design-system/components';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import {
  useActualizarProveedorMutation,
  useCrearProveedorMutation,
  useEliminarProveedorMutation,
  useProveedoresRepuestosQuery,
} from '@/hooks/useProveedoresRepuestosQuery';
import type { ProveedorRepuestos } from '@/services/proveedorRepuestosService';

const I = COLORS.institutional;

const TIPO_LABEL: Record<string, string> = {
  mostrador: 'Mostrador',
  distribuidor: 'Distribuidor',
  concesionario: 'Concesionario',
  marketplace: 'Marketplace',
};

export default function CasasRepuestosScreen() {
  const { data = [], isPending, isRefetching, refetch } = useProveedoresRepuestosQuery();
  const crear = useCrearProveedorMutation();
  const actualizar = useActualizarProveedorMutation();
  const eliminar = useEliminarProveedorMutation();
  const [formVisible, setFormVisible] = useState(false);
  const [editando, setEditando] = useState<ProveedorRepuestos | null>(null);
  const [nombre, setNombre] = useState('');
  const [comuna, setComuna] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');

  const abrirNuevo = useCallback(() => {
    setEditando(null);
    setNombre('');
    setComuna('');
    setTelefono('');
    setDireccion('');
    setNotas('');
    setFormVisible(true);
  }, []);

  const abrirEditar = useCallback((p: ProveedorRepuestos) => {
    setEditando(p);
    setNombre(p.nombre);
    setComuna(p.comuna || '');
    setTelefono(p.telefono || '');
    setDireccion(p.direccion || '');
    setNotas(p.notas || '');
    setFormVisible(true);
  }, []);

  const guardar = useCallback(async () => {
    if (!nombre.trim()) {
      showAlert('Nombre requerido', 'Indica el nombre de la casa de repuestos.');
      return;
    }
    const payload = {
      nombre: nombre.trim(),
      comuna: comuna.trim(),
      telefono: telefono.trim(),
      direccion: direccion.trim(),
      notas: notas.trim(),
    };
    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.id, payload });
      } else {
        await crear.mutateAsync(payload);
      }
      setFormVisible(false);
    } catch {
      showAlert('No se pudo guardar', 'Intenta de nuevo.');
    }
  }, [actualizar, comuna, crear, direccion, editando, nombre, notas, telefono]);

  const marcarPreferida = useCallback((p: ProveedorRepuestos) => {
    actualizar.mutate({ id: p.id, payload: { es_preferido: !p.es_preferido } });
  }, [actualizar]);

  const desactivar = useCallback((p: ProveedorRepuestos) => {
    showConfirm('Quitar casa', `¿Desactivar "${p.nombre}"? Los precios asociados se conservan.`, {
      confirmText: 'Desactivar',
      onConfirm: () => {
        eliminar.mutate(p.id, {
          onError: () => showAlert('No se pudo quitar', 'Intenta de nuevo.'),
        });
      },
    });
  }, [eliminar]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Casas de repuestos" showBack onBackPress={() => router.back()} />

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
          <HostSectionKicker label="Dónde compras" />
          {data.length === 0 ? (
            <HostEmptyState
              icon={Store}
              title="Sin casas de repuestos"
              description="Agrega las casas de repuestos donde compras. Así tus cotizaciones usan precios reales y no valores de internet."
              primaryAction={{ label: 'Agregar casa', onPress: abrirNuevo }}
            />
          ) : (
            <View style={styles.list}>
              {data.map((p) => (
                <Card key={p.id} elevated padding="host" style={styles.card}>
                  <TouchableOpacity onPress={() => abrirEditar(p)}>
                    <InstitutionalText role="h5">{p.nombre}</InstitutionalText>
                    <InstitutionalText role="caption" color="muted">
                      {[TIPO_LABEL[p.tipo] || p.tipo, p.comuna].filter(Boolean).join(' · ')}
                    </InstitutionalText>
                  </TouchableOpacity>
                  <View style={styles.chips}>
                    {p.es_preferido ? (
                      <InstitutionalTag label="Preferida" variant="success" size="sm" />
                    ) : null}
                    {p.telefono ? (
                      <InstitutionalTag label={p.telefono} variant="neutral" size="sm" />
                    ) : null}
                  </View>
                  <View style={styles.actions}>
                    <InstitutionalButton
                      label={p.es_preferido ? 'Quitar preferida' : 'Marcar preferida'}
                      variant="outline"
                      size="compact"
                      onPress={() => marcarPreferida(p)}
                    />
                    <InstitutionalButton
                      label="Quitar"
                      variant="tertiary"
                      size="compact"
                      onPress={() => desactivar(p)}
                    />
                  </View>
                </Card>
              ))}
            </View>
          )}
          {data.length > 0 ? (
            <InstitutionalButton label="Agregar casa" onPress={abrirNuevo} />
          ) : null}
        </ScrollView>
      )}

      <BottomSheet visible={formVisible} onClose={() => setFormVisible(false)} stickyFooter>
        <InstitutionalText role="h3">
          {editando ? 'Editar casa' : 'Nueva casa de repuestos'}
        </InstitutionalText>
        <View style={styles.form}>
          <InstitutionalField label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Refax Maipú" />
          <InstitutionalField label="Comuna" value={comuna} onChangeText={setComuna} placeholder="Maipú" />
          <InstitutionalField label="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
          <InstitutionalField label="Dirección" value={direccion} onChangeText={setDireccion} />
          <InstitutionalField label="Notas" value={notas} onChangeText={setNotas} />
        </View>
        <InstitutionalButton
          label="Guardar"
          onPress={() => void guardar()}
          loading={crear.isPending || actualizar.isPending}
        />
      </BottomSheet>
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.fixed.xs },
  form: { gap: SPACING.fixed.sm, paddingVertical: SPACING.fixed.sm },
});

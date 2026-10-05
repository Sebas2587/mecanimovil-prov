import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Phone, Search } from 'lucide-react-native';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/design-system/iconography';
import { usePipelineClientesQuery } from '@/hooks/usePipelineClientesQuery';
import { useTallerShell } from '@/components/navigation/TallerShellContext';
import type { PipelineClienteItem } from '@/services/pipelineComercialService';
import { ClienteFichaSheet } from '@/components/taller/ClienteFichaSheet';
import { CotizacionDetalleSheet } from '@/components/taller/CotizacionDetalleSheet';
import { CotizacionEstadoBadge } from '@/components/taller/CotizacionEstadoBadge';
import { esPasoComercial, PASO_ETIQUETA, type PasoComercial } from '@/utils/pasoComercial';
import type { EstadoCotizacionVista } from '@/utils/cotizacionPresentacion';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

type Props = {
  pasoInicial?: string | null;
  busquedaInicial?: string | null;
};

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
}

function estadoDePaso(paso: PasoComercial): EstadoCotizacionVista {
  if (paso === 'por_enviar') return 'borrador';
  if (paso === 'esperando') return 'enviada';
  if (paso === 'por_agendar') return 'aceptada';
  if (paso === 'en_agenda') return 'agendada';
  return 'borrador';
}

export function ClientesVista({ pasoInicial, busquedaInicial }: Props) {
  const insets = useSafeAreaInsets();
  const { ocupaTope, accionFlotante } = useTallerShell();
  const paso = esPasoComercial(pasoInicial) ? pasoInicial : undefined;
  const [busqueda, setBusqueda] = useState(busquedaInicial?.trim() || '');
  const [q, setQ] = useState(busquedaInicial?.trim() || '');
  const [clienteKey, setClienteKey] = useState<string | null>(null);
  const [cotizacionId, setCotizacionId] = useState<number | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setQ(busqueda.trim()), 300);
    return () => clearTimeout(handle);
  }, [busqueda]);

  const query = usePipelineClientesQuery({
    limite: 100,
    prioridad: 'todos',
    paso,
    q: q || undefined,
  });
  const clientes = query.data?.results ?? [];

  const abrir = useCallback((key: string) => setClienteKey(key), []);
  const cerrarCliente = useCallback(() => setClienteKey(null), []);
  const abrirCotizacion = useCallback((id: number) => {
    setClienteKey(null);
    setTimeout(() => setCotizacionId(id), 280);
  }, []);
  const cerrarCotizacion = useCallback(() => setCotizacionId(null), []);

  return (
    <View style={[styles.screen, { paddingTop: ocupaTope ? SPACING.fixed.xs : insets.top }]}>
      <FlatList
        data={clientes}
        keyExtractor={(item) => item.cliente_key}
        contentContainerStyle={[styles.lista, { paddingBottom: accionFlotante ? 150 : 120 }]}
        refreshControl={(
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={I.primary}
          />
        )}
        ListHeaderComponent={(
          <View style={styles.cabecera}>
            <InstitutionalText role="h2">Clientes</InstitutionalText>
            <InstitutionalText role="caption" color="body">
              {query.data?.count ?? clientes.length} clientes con cotizaciones
            </InstitutionalText>
            <View style={styles.buscador}>
              <Search size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar por nombre o teléfono"
                placeholderTextColor={I.muted}
                style={styles.input}
                autoCorrect={false}
                accessibilityLabel="Buscar clientes"
              />
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.vacio}>
            <InstitutionalText role="bodyBold">
              {query.isPending ? 'Cargando clientes' : 'Sin clientes'}
            </InstitutionalText>
            <InstitutionalText role="caption" color="body">
              {query.isPending
                ? 'Estamos armando el directorio.'
                : 'No hay clientes que coincidan con la búsqueda.'}
            </InstitutionalText>
          </View>
        )}
        renderItem={({ item }) => (
          <ClienteFila cliente={item} onOpen={abrir} />
        )}
      />
      <ClienteFichaSheet
        clienteKey={clienteKey}
        onClose={cerrarCliente}
        onOpenCotizacion={abrirCotizacion}
      />
      <CotizacionDetalleSheet cotizacionId={cotizacionId} onClose={cerrarCotizacion} />
    </View>
  );
}

const ClienteFila = memo(function ClienteFila({
  cliente,
  onOpen,
}: {
  cliente: PipelineClienteItem;
  onOpen: (key: string) => void;
}) {
  const handlePress = useCallback(() => onOpen(cliente.cliente_key), [cliente.cliente_key, onOpen]);
  const llamar = useCallback(() => {
    const tel = cliente.cliente_telefono?.replace(/\s/g, '');
    if (!tel) return;
    void Linking.openURL(`tel:${tel}`);
  }, [cliente.cliente_telefono]);
  const paso = esPasoComercial(cliente.siguiente_paso) ? cliente.siguiente_paso : null;
  const detalle = [
    cliente.casos_count === 1 ? '1 cotización' : `${cliente.casos_count} cotizaciones`,
    cliente.aceptadas > 0 ? `${cliente.aceptadas} aceptada${cliente.aceptadas === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ');
  return (
    <View style={styles.fila}>
      <Pressable onPress={handlePress} style={styles.filaMain} accessibilityRole="button">
        <View style={styles.avatar}>
          <InstitutionalText role="captionBold" color="onPrimary">
            {iniciales(cliente.cliente_nombre) || 'C'}
          </InstitutionalText>
        </View>
        <View style={styles.copy}>
          <InstitutionalText role="bodyBold" numberOfLines={1}>{cliente.cliente_nombre}</InstitutionalText>
          <InstitutionalText role="caption" color="body" numberOfLines={1}>{detalle}</InstitutionalText>
          {paso ? (
            <CotizacionEstadoBadge estado={estadoDePaso(paso)} label={PASO_ETIQUETA[paso]} suave />
          ) : null}
        </View>
        <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
      </Pressable>
      {cliente.cliente_telefono ? (
        <Pressable
          onPress={llamar}
          style={styles.llamar}
          accessibilityRole="button"
          accessibilityLabel={`Llamar a ${cliente.cliente_nombre}`}
        >
          <Phone size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  lista: {
    paddingHorizontal: SPACING.fixed.md,
    paddingBottom: 120,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  cabecera: {
    gap: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.md,
  },
  buscador: {
    marginTop: SPACING.fixed.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.paper,
    paddingHorizontal: SPACING.fixed.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontFamily: FF.sansRegular,
    fontSize: 14,
    color: I.ink,
    paddingVertical: 8,
  },
  vacio: {
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xl,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    paddingVertical: SPACING.fixed.sm,
  },
  filaMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: I.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  llamar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

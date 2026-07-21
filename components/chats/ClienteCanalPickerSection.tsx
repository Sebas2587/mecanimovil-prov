import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { ChevronDown, Search, UserRound, X } from 'lucide-react-native';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { Card } from '@/app/design-system/components';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { ChilePhoneField } from '@/components/forms/ChilePhoneField';
import { ChannelBadge } from '@/components/chats/ChannelBadge';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { useChatInboxQuery } from '@/hooks/useChatInboxQuery';
import type { InboxChatItem } from '@/services/omnichannelService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { getChannelVisual, type ChannelSlug } from '@/utils/channelVisuals';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type ClienteModo = 'mensajes' | 'manual';

export type ContactoCanal = {
  conversationId: number;
  nombre: string;
  telefono: string | null;
  canal: ChannelSlug;
};

const CLIENTE_TABS = [
  { key: 'mensajes' as const, label: 'Desde mensajes' },
  { key: 'manual' as const, label: 'Cliente nuevo' },
];

export function contactosDesdeInbox(items: InboxChatItem[]): ContactoCanal[] {
  const seen = new Set<string>();
  const out: ContactoCanal[] = [];
  for (const item of items) {
    if (item.kind !== 'omnichannel' || !item.conversation_id) continue;
    const key = String(item.conversation_id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      conversationId: Number(item.conversation_id),
      nombre: item.otra_persona?.nombre?.trim() || 'Cliente',
      telefono: item.otra_persona?.telefono ?? null,
      canal: (item.channel || 'whatsapp') as ChannelSlug,
    });
  }
  return out;
}

type Props = {
  enabled?: boolean;
  clienteModo: ClienteModo;
  onClienteModoChange: (modo: ClienteModo) => void;
  contactoSeleccionado: ContactoCanal | null;
  onSeleccionarContacto: (c: ContactoCanal) => void;
  onLimpiarContacto: () => void;
  clienteNombre: string;
  onClienteNombreChange: (v: string) => void;
  clienteTelefono: string;
  onClienteTelefonoChange: (v: string) => void;
  /** Hint bajo teléfono en modo manual. */
  telefonoHint?: string;
  manualFooterHint?: string;
};

/**
 * Selector de cliente compartido: Desde mensajes / Cliente nuevo.
 * Usado en Nueva cotización y Agendar cita.
 */
export function ClienteCanalPickerSection({
  enabled = true,
  clienteModo,
  onClienteModoChange,
  contactoSeleccionado,
  onSeleccionarContacto,
  onLimpiarContacto,
  clienteNombre,
  onClienteNombreChange,
  clienteTelefono,
  onClienteTelefonoChange,
  telefonoHint = 'Opcional. Indicativo +56; ingresa 9 dígitos comenzando en 9.',
  manualFooterHint = 'Sin chat vinculado se genera un link público o agenda sin canal.',
}: Props) {
  const { data: inbox = [], isPending: inboxLoading } = useChatInboxQuery(enabled);
  const contactos = useMemo(() => contactosDesdeInbox(inbox), [inbox]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [busquedaContacto, setBusquedaContacto] = useState('');
  const [filtroCanal, setFiltroCanal] = useState<'todos' | ChannelSlug>('todos');

  const canalesDisponibles = useMemo(() => {
    const set = new Set<ChannelSlug>();
    for (const c of contactos) set.add(c.canal);
    return Array.from(set);
  }, [contactos]);

  const contactosFiltrados = useMemo(() => {
    const q = busquedaContacto.trim().toLowerCase();
    return contactos.filter((c) => {
      if (filtroCanal !== 'todos' && c.canal !== filtroCanal) return false;
      if (!q) return true;
      const blob = `${c.nombre} ${c.telefono || ''} ${c.canal}`.toLowerCase();
      return blob.includes(q);
    });
  }, [contactos, busquedaContacto, filtroCanal]);

  const abrirPicker = useCallback(() => {
    setBusquedaContacto('');
    setFiltroCanal('todos');
    setPickerVisible(true);
  }, []);

  const cerrarPicker = useCallback(() => {
    setPickerVisible(false);
    setBusquedaContacto('');
  }, []);

  const seleccionar = useCallback((c: ContactoCanal) => {
    onSeleccionarContacto(c);
    setPickerVisible(false);
    setBusquedaContacto('');
  }, [onSeleccionarContacto]);

  const renderContactoItem = useCallback(
    ({ item }: { item: ContactoCanal }) => (
      <TouchableOpacity
        style={styles.contactoRow}
        onPress={() => seleccionar(item)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Elegir ${item.nombre}`}
      >
        <View style={hostIconPlateStyle}>
          <UserRound size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <View style={styles.contactoText}>
          <InstitutionalText role="h5" numberOfLines={1}>
            {item.nombre}
          </InstitutionalText>
          {item.telefono ? (
            <InstitutionalText role="caption" color="muted" numberOfLines={1}>
              {item.telefono}
            </InstitutionalText>
          ) : null}
        </View>
        <ChannelBadge channel={item.canal} compact />
      </TouchableOpacity>
    ),
    [seleccionar],
  );

  return (
    <>
      <View style={styles.underlineTabs}>
        {CLIENTE_TABS.map((tab) => {
          const active = clienteModo === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.underlineTab, active && styles.underlineTabActive]}
              onPress={() => {
                onClienteModoChange(tab.key);
                if (tab.key === 'manual') onLimpiarContacto();
              }}
              activeOpacity={0.75}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <InstitutionalText
                role={active ? 'captionBold' : 'caption'}
                color={active ? 'ink' : 'muted'}
              >
                {tab.label}
              </InstitutionalText>
            </TouchableOpacity>
          );
        })}
      </View>

      {clienteModo === 'mensajes' ? (
        <>
          {contactoSeleccionado ? (
            <Card elevated padding="host" style={styles.selectedContact}>
              <View style={styles.selectedContactMain}>
                <View style={hostIconPlateStyle}>
                  <UserRound size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
                <View style={styles.selectedContactText}>
                  <InstitutionalText role="h5" numberOfLines={1}>
                    {contactoSeleccionado.nombre}
                  </InstitutionalText>
                  {contactoSeleccionado.telefono ? (
                    <InstitutionalText role="caption" color="muted" numberOfLines={1}>
                      {contactoSeleccionado.telefono}
                    </InstitutionalText>
                  ) : null}
                </View>
                <ChannelBadge channel={contactoSeleccionado.canal} compact />
              </View>
              <TouchableOpacity onPress={abrirPicker} hitSlop={8}>
                <InstitutionalText role="captionBold" color="primary">
                  Cambiar
                </InstitutionalText>
              </TouchableOpacity>
            </Card>
          ) : (
            <Card
              elevated
              padding="host"
              style={styles.pickerTrigger}
              onPress={abrirPicker}
            >
              <View style={styles.pickerTriggerLeft}>
                <View style={hostIconPlateStyle}>
                  <Search size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
                <View style={styles.pickerTriggerText}>
                  <InstitutionalText role="h5">Elegir cliente</InstitutionalText>
                  <InstitutionalText role="caption" color="muted" numberOfLines={1}>
                    {inboxLoading
                      ? 'Cargando contactos…'
                      : contactos.length > 0
                        ? `${contactos.length} contactos en Mensajes`
                        : 'Sin contactos de canal aún'}
                  </InstitutionalText>
                </View>
              </View>
              <ChevronDown size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            </Card>
          )}
          {!inboxLoading && contactos.length === 0 ? (
            <InstitutionalText role="caption" color="muted">
              No hay contactos de canal. Usa “Cliente nuevo” o espera un mensaje.
            </InstitutionalText>
          ) : null}
        </>
      ) : (
        <>
          <InstitutionalField
            label="Nombre *"
            value={clienteNombre}
            onChangeText={onClienteNombreChange}
            placeholder="Nombre del cliente"
          />
          <ChilePhoneField
            label="Teléfono"
            hint={telefonoHint}
            value={clienteTelefono}
            onChangeValue={onClienteTelefonoChange}
            required={false}
          />
          {manualFooterHint ? (
            <InstitutionalText role="caption" color="muted">
              {manualFooterHint}
            </InstitutionalText>
          ) : null}
        </>
      )}

      <BottomSheet visible={pickerVisible} onClose={cerrarPicker}>
        <View style={styles.pickerHeader}>
          <View style={styles.headerText}>
            <InstitutionalText role="h4">Elegir cliente</InstitutionalText>
            <InstitutionalText role="caption" color="muted">
              Filtra por canal o busca por nombre
            </InstitutionalText>
          </View>
          <TouchableOpacity onPress={cerrarPicker} accessibilityLabel="Cerrar selector">
            <X size={22} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Search size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre, teléfono…"
            placeholderTextColor={I.mutedSoft}
            value={busquedaContacto}
            onChangeText={setBusquedaContacto}
            autoFocus={Platform.OS === 'web'}
          />
        </View>

        {canalesDisponibles.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.canalChips}
            style={styles.canalChipsScroll}
          >
            <TouchableOpacity
              style={[styles.canalChip, filtroCanal === 'todos' && styles.canalChipActive]}
              onPress={() => setFiltroCanal('todos')}
              accessibilityRole="tab"
              accessibilityState={{ selected: filtroCanal === 'todos' }}
            >
              <InstitutionalText
                role={filtroCanal === 'todos' ? 'captionBold' : 'caption'}
                color={filtroCanal === 'todos' ? 'ink' : 'muted'}
              >
                Todos ({contactos.length})
              </InstitutionalText>
            </TouchableOpacity>
            {canalesDisponibles.map((canal) => {
              const count = contactos.filter((c) => c.canal === canal).length;
              const label = getChannelVisual(canal).label;
              const active = filtroCanal === canal;
              return (
                <TouchableOpacity
                  key={canal}
                  style={[styles.canalChip, active && styles.canalChipActive]}
                  onPress={() => setFiltroCanal(canal)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <InstitutionalText
                    role={active ? 'captionBold' : 'caption'}
                    color={active ? 'ink' : 'muted'}
                  >
                    {label} ({count})
                  </InstitutionalText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {inboxLoading ? (
          <ActivityIndicator color={I.ink} style={styles.pickerLoader} />
        ) : (
          <FlatList
            data={contactosFiltrados}
            keyExtractor={(item) => String(item.conversationId)}
            renderItem={renderContactoItem}
            style={styles.pickerList}
            contentContainerStyle={
              contactosFiltrados.length === 0 ? styles.pickerListEmpty : undefined
            }
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <InstitutionalText role="caption" color="muted" style={styles.pickerEmpty}>
                Ningún contacto coincide con el filtro.
              </InstitutionalText>
            }
          />
        )}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  underlineTabs: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    marginBottom: SPACING.fixed.xs,
  },
  underlineTab: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  underlineTabActive: {
    borderBottomColor: I.ink,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  pickerTriggerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  pickerTriggerText: { flex: 1, minWidth: 0, gap: 2 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.sm,
  },
  headerText: { flex: 1, paddingRight: SPACING.fixed.sm, gap: 2 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    marginBottom: SPACING.fixed.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    color: I.ink,
    padding: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  canalChipsScroll: { flexGrow: 0, marginBottom: SPACING.fixed.sm },
  canalChips: { gap: SPACING.fixed.xs, paddingRight: SPACING.fixed.sm },
  canalChip: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
  },
  canalChipActive: {
    backgroundColor: COLORS.background.paper,
    borderColor: I.ink,
  },
  pickerList: {
    maxHeight: 320,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    overflow: 'hidden',
  },
  pickerListEmpty: {
    paddingVertical: SPACING.fixed.lg,
    paddingHorizontal: SPACING.fixed.md,
  },
  pickerEmpty: { textAlign: 'center' },
  pickerLoader: { marginVertical: SPACING.fixed.lg },
  contactoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    backgroundColor: COLORS.background.paper,
  },
  contactoText: { flex: 1, minWidth: 0, gap: 2 },
  selectedContact: {
    gap: SPACING.fixed.sm,
  },
  selectedContactMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  selectedContactText: { flex: 1, minWidth: 0, gap: 2 },
});

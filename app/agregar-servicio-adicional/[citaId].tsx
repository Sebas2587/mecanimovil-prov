import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { InstitutionalButton } from '@/design-system/components/InstitutionalButton';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '@/app/design-system/tokens';
import { HostPaperSection, hostScreenStyles } from '@/app/design-system/components';
import { useCitaPersonalQuery } from '@/hooks/useCitaPersonalQuery';
import { useMisServiciosQuery } from '@/hooks/useMisServiciosQuery';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import type { ServicioOfertaRow } from '@/hooks/useMisServiciosQuery';

const I = COLORS.institutional;

function formatPrecio(val: string | number | undefined): string {
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return 'Sin precio';
  return `$${Math.round(n).toLocaleString('es-CL')} CLP`;
}

export default function AgregarServicioAdicionalScreen() {
  const { citaId } = useLocalSearchParams<{ citaId: string }>();
  const parsedId = Number(citaId);
  const insets = useSafeAreaInsets();

  const { data: cita, isPending: citaLoading } = useCitaPersonalQuery(
    Number.isFinite(parsedId) ? parsedId : undefined,
  );
  const { data: catalogo, isPending: catalogoLoading } = useMisServiciosQuery(true);

  const [motivo, setMotivo] = useState('');
  const [modo, setModo] = useState<'catalogo' | 'ia'>('catalogo');
  const [servicioIa, setServicioIa] = useState('');
  const [descripcionIa, setDescripcionIa] = useState('');
  const [seleccionados, setSeleccionados] = useState<Record<number, number>>({});
  const [enviando, setEnviando] = useState(false);

  const serviciosDisponibles = useMemo(() => {
    const rows = catalogo?.servicios ?? [];
    return rows.filter((s) => s.disponible);
  }, [catalogo?.servicios]);

  const toggleServicio = useCallback((oferta: ServicioOfertaRow) => {
    setSeleccionados((prev) => {
      const next = { ...prev };
      if (next[oferta.id]) {
        delete next[oferta.id];
      } else {
        next[oferta.id] = 1;
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!cita?.cotizacion_canal_origen_id) {
      Alert.alert('No disponible', 'Esta cita no tiene una cotización de canal asociada.');
      return;
    }
    const motivoTrim = motivo.trim();
    if (!motivoTrim) {
      Alert.alert('Motivo requerido', 'Indica por qué se detectó este servicio adicional.');
      return;
    }

    const payloadBase = {
      cita_id: cita.id,
      cotizacion_original_id: cita.cotizacion_canal_origen_id,
      motivo_servicio_adicional: motivoTrim,
    };

    try {
      setEnviando(true);
      if (modo === 'ia') {
        const nombre = servicioIa.trim();
        if (!nombre) {
          Alert.alert('Servicio requerido', 'Indica qué servicio adicional quieres cotizar.');
          return;
        }
        await cotizacionCanalService.crearAdicional({
          ...payloadBase,
          modo: 'ia',
          servicio_nombre: nombre,
          descripcion_problema: descripcionIa.trim() || motivoTrim,
        });
      } else {
        const ids = Object.keys(seleccionados).map(Number);
        if (ids.length === 0) {
          Alert.alert('Catálogo', 'Selecciona al menos un servicio del catálogo.');
          return;
        }
        await cotizacionCanalService.crearAdicional({
          ...payloadBase,
          modo: 'catalogo',
          servicios_catalogo: ids.map((id) => ({
            oferta_servicio_id: id,
            cantidad: seleccionados[id] ?? 1,
          })),
        });
      }
      Alert.alert(
        'Borrador creado',
        'La cotización adicional quedó en Cotizar con IA para que la revises y envíes.',
        [{ text: 'Ir a Cotizar con IA', onPress: () => router.replace('/cotizar-ia') }],
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } })
          ?.response?.data?.detail
        || (err as Error)?.message
        || 'No se pudo crear la cotización adicional.';
      Alert.alert('Error', String(msg));
    } finally {
      setEnviando(false);
    }
  }, [cita, descripcionIa, modo, motivo, seleccionados, servicioIa]);

  if (citaLoading || !Number.isFinite(parsedId)) {
    return (
      <View style={[styles.center, hostScreenStyles.screen]}>
        <ActivityIndicator color={I.primary} />
      </View>
    );
  }

  if (!cita) {
    return (
      <View style={[styles.center, hostScreenStyles.screen]}>
        <Text style={styles.errorText}>No encontramos esta cita.</Text>
      </View>
    );
  }

  if (!cita.permite_cotizacion_adicional) {
    return (
      <View style={hostScreenStyles.screen}>
        <Header title="Servicio adicional" showBack onBackPress={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>
            Este trabajo aún no permite cotizaciones adicionales. Confirma el horario o inicia el
            servicio primero.
          </Text>
        </View>
      </View>
    );
  }

  const servicioOriginal =
    cita.detalle.servicio_nombre_resuelto
    || cita.detalle.servicio_nombre
    || cita.detalle.descripcion
    || 'Servicio en curso';

  return (
    <View style={hostScreenStyles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Agregar otro servicio" showBack onBackPress={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + SPACING.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <HostPaperSection>
            <Text style={styles.kicker}>Trabajo actual</Text>
            <Text style={styles.cardTitle}>{servicioOriginal}</Text>
            <Text style={styles.cardSub}>
              {cita.detalle.cliente_nombre} · {[cita.detalle.vehiculo_marca, cita.detalle.vehiculo_modelo]
                .filter(Boolean)
                .join(' ')}
            </Text>
          </HostPaperSection>

          <HostPaperSection style={styles.sectionGap}>
            <Text style={styles.label}>Motivo del servicio adicional *</Text>
            <TextInput
              style={styles.textArea}
              multiline
              placeholder="Ej.: Al revisar el vehículo se detectó filtro de aceite obstruido"
              placeholderTextColor={I.mutedSoft}
              value={motivo}
              onChangeText={setMotivo}
            />
          </HostPaperSection>

          <HostPaperSection style={styles.sectionGap}>
            <Text style={styles.label}>Modo de cotización</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeChip, modo === 'catalogo' && styles.modeChipActive]}
                onPress={() => setModo('catalogo')}
              >
                <Text style={[styles.modeChipText, modo === 'catalogo' && styles.modeChipTextActive]}>
                  Manual (catálogo)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeChip, modo === 'ia' && styles.modeChipActive]}
                onPress={() => setModo('ia')}
              >
                <Text style={[styles.modeChipText, modo === 'ia' && styles.modeChipTextActive]}>
                  Con IA
                </Text>
              </TouchableOpacity>
            </View>
          </HostPaperSection>

          {modo === 'catalogo' ? (
            <HostPaperSection style={styles.sectionGap}>
              <Text style={styles.label}>Servicios del catálogo</Text>
              {catalogoLoading ? (
                <ActivityIndicator color={I.primary} style={{ marginTop: SPACING.md }} />
              ) : serviciosDisponibles.length === 0 ? (
                <Text style={styles.hint}>No hay servicios publicados en tu catálogo.</Text>
              ) : (
                serviciosDisponibles.map((oferta) => {
                  const selected = Boolean(seleccionados[oferta.id]);
                  const nombre = oferta.servicio_info?.nombre || 'Servicio';
                  const precio =
                    oferta.desglose_precios?.precio_final_cliente
                    ?? oferta.precio_publicado_cliente;
                  return (
                    <TouchableOpacity
                      key={oferta.id}
                      style={[styles.servicioRow, selected && styles.servicioRowSelected]}
                      onPress={() => toggleServicio(oferta)}
                    >
                      <View style={styles.servicioTextCol}>
                        <Text style={styles.servicioNombre}>{nombre}</Text>
                        <Text style={styles.servicioPrecio}>{formatPrecio(precio)}</Text>
                      </View>
                      <View style={[styles.check, selected && styles.checkOn]}>
                        {selected ? <Text style={styles.checkMark}>✓</Text> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </HostPaperSection>
          ) : (
            <HostPaperSection style={styles.sectionGap}>
              <Text style={styles.label}>Servicio a cotizar con IA *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej.: Cambio de filtro de aceite"
                placeholderTextColor={I.mutedSoft}
                value={servicioIa}
                onChangeText={setServicioIa}
              />
              <Text style={[styles.label, { marginTop: SPACING.md }]}>Detalle (opcional)</Text>
              <TextInput
                style={styles.textArea}
                multiline
                placeholder="Contexto adicional para la IA"
                placeholderTextColor={I.mutedSoft}
                value={descripcionIa}
                onChangeText={setDescripcionIa}
              />
            </HostPaperSection>
          )}

          <InstitutionalButton
            label={enviando ? 'Creando borrador…' : 'Crear borrador para revisar'}
            variant="primary"
            onPress={() => void handleSubmit()}
            disabled={enviando}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  scroll: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionGap: { marginTop: SPACING.sm },
  kicker: {
    ...TYPOGRAPHY.styles.caption,
    color: I.muted,
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    ...TYPOGRAPHY.styles.subtitle,
    color: I.ink,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
  cardSub: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: I.muted,
    marginTop: SPACING.xs,
  },
  label: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: I.ink,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: I.border,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: I.ink,
    backgroundColor: I.canvas,
  },
  textArea: {
    borderWidth: 1,
    borderColor: I.border,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 96,
    textAlignVertical: 'top',
    color: I.ink,
    backgroundColor: I.canvas,
  },
  modeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modeChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: I.border,
    alignItems: 'center',
  },
  modeChipActive: {
    borderColor: I.primary,
    backgroundColor: `${I.primary}12`,
  },
  modeChipText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: I.muted,
  },
  modeChipTextActive: {
    color: I.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
  servicioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.border,
  },
  servicioRowSelected: {
    backgroundColor: `${I.primary}08`,
  },
  servicioTextCol: { flex: 1 },
  servicioNombre: {
    ...TYPOGRAPHY.styles.body,
    color: I.ink,
  },
  servicioPrecio: {
    ...TYPOGRAPHY.styles.caption,
    color: I.muted,
    marginTop: 2,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: I.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  checkMark: {
    color: I.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: I.muted,
  },
  submitBtn: {
    marginTop: SPACING.lg,
  },
  errorText: {
    ...TYPOGRAPHY.styles.body,
    color: I.muted,
    textAlign: 'center',
  },
});

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { InstitutionalButton } from '@/design-system/components/InstitutionalButton';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import {
  COLORS,
  SPACING,
  BORDERS,
  TYPOGRAPHY,
  withOpacity,
} from '@/app/design-system/tokens';
import {
  HostPaperSection,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { useCitaPersonalQuery } from '@/hooks/useCitaPersonalQuery';
import { useMisServiciosQuery } from '@/hooks/useMisServiciosQuery';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import type { ServicioOfertaRow } from '@/hooks/useMisServiciosQuery';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';
import {
  EjecucionAdicionalCampos,
  pickerDesdePropuesta,
  type EjecucionAdicional,
} from '@/components/cotizaciones/EjecucionAdicionalCampos';
import { formatDateApi, formatFechaHoraPropuesta } from '@/utils/fechaLocal';
import type { CatalogoFechaHoraValue } from '@/components/solicitudes/CatalogoFechaHoraPickers';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

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
  const [ejecucion, setEjecucion] = useState<EjecucionAdicional>('misma_visita');
  const [fechaHora, setFechaHora] = useState<CatalogoFechaHoraValue>(() => pickerDesdePropuesta());

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
      showAlert('No disponible', 'Esta cita no tiene una cotización de canal asociada.');
      return;
    }
    const motivoTrim = motivo.trim();
    if (!motivoTrim) {
      showAlert('Motivo requerido', 'Indica por qué se detectó este servicio adicional.');
      return;
    }

    const payloadBase = {
      cita_id: cita.id,
      cotizacion_original_id: cita.cotizacion_canal_origen_id,
      motivo_servicio_adicional: motivoTrim,
      ejecucion_adicional: ejecucion,
      ...(ejecucion === 'nueva_fecha'
        ? {
            fecha_propuesta: formatDateApi(fechaHora.fecha),
            hora_propuesta: fechaHora.hora,
          }
        : {}),
    };

    if (ejecucion === 'nueva_fecha' && !fechaHora.hora) {
      showAlert('Hora requerida', 'Indica el día y la hora acordados con el cliente.');
      return;
    }

    try {
      setEnviando(true);
      let created: { cotizacion: { id: number } };
      if (modo === 'ia') {
        const nombre = servicioIa.trim();
        if (!nombre) {
          showAlert('Servicio requerido', 'Indica qué servicio adicional quieres cotizar.');
          return;
        }
        created = await cotizacionCanalService.crearAdicional({
          ...payloadBase,
          modo: 'ia',
          servicio_nombre: nombre,
          descripcion_problema: descripcionIa.trim() || motivoTrim,
        });
      } else {
        const ids = Object.keys(seleccionados).map(Number);
        if (ids.length === 0) {
          showAlert('Catálogo', 'Selecciona al menos un servicio del catálogo.');
          return;
        }
        created = await cotizacionCanalService.crearAdicional({
          ...payloadBase,
          modo: 'catalogo',
          servicios_catalogo: ids.map((id) => ({
            oferta_servicio_id: id,
            cantidad: seleccionados[id] ?? 1,
          })),
        });
      }
      const slotTxt =
        ejecucion === 'nueva_fecha'
          ? formatFechaHoraPropuesta(formatDateApi(fechaHora.fecha), fechaHora.hora)
          : '';
      const cotId = created?.cotizacion?.id;
      showAlertButtons(
        'Borrador creado',
        ejecucion === 'nueva_fecha'
          ? `Quedó ligado a este trabajo. Fecha propuesta: ${slotTxt}. Revísalo y envíalo al cliente.`
          : 'Quedó ligado a este trabajo en curso. Revísalo y envíalo al cliente.',
        [{
          text: 'Revisar y enviar',
          onPress: () => {
            if (cotId) router.replace(`/cotizacion-canal/${cotId}`);
            else router.replace('/cotizar-ia');
          },
        }],
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } })
          ?.response?.data?.detail
        || (err as Error)?.message
        || 'No se pudo crear la cotización adicional.';
      showAlert('Error', String(msg));
    } finally {
      setEnviando(false);
    }
  }, [cita, descripcionIa, ejecucion, fechaHora, modo, motivo, seleccionados, servicioIa]);

  if (citaLoading || !Number.isFinite(parsedId)) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator color={I.primary} />
        </View>
      </View>
    );
  }

  if (!cita) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Servicio adicional" showBack onBackPress={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>No encontramos esta cita.</Text>
        </View>
      </View>
    );
  }

  if (!cita.permite_cotizacion_adicional) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Servicio adicional" showBack onBackPress={() => router.back()} />
        <View style={[styles.center, hostScreenStyles.gutterX]}>
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
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Agregar hallazgo" showBack onBackPress={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={hostScreenStyles.scroll}
          contentContainerStyle={[
            hostScreenStyles.scrollInner,
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, SPACING.fixed.md) + SPACING.fixed.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <HostSectionKicker label="Trabajo actual" />
          <HostPaperSection style={styles.section}>
            <Text style={styles.cardTitle}>{servicioOriginal}</Text>
            <Text style={styles.cardSub}>
              {[cita.detalle.cliente_nombre, [cita.detalle.vehiculo_marca, cita.detalle.vehiculo_modelo]
                .filter(Boolean)
                .join(' ')]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </HostPaperSection>

          <HostSectionKicker label="Motivo" />
          <HostPaperSection style={styles.section}>
            <InstitutionalField
              label="Motivo del servicio adicional"
              multiline
              placeholder="Ej.: Al revisar el vehículo se detectó filtro de aceite obstruido"
              value={motivo}
              onChangeText={setMotivo}
            />
          </HostPaperSection>

          <HostSectionKicker label="¿Cuándo se hace?" />
          <HostPaperSection style={styles.section}>
            <EjecucionAdicionalCampos
              ejecucion={ejecucion}
              onEjecucionChange={setEjecucion}
              fechaHora={fechaHora}
              onFechaHoraChange={setFechaHora}
            />
          </HostPaperSection>

          <HostSectionKicker label="Modo de cotización" />
          <HostPaperSection style={styles.section}>
            <View style={styles.modeRow}>
              <Pressable
                style={[styles.modeChip, modo === 'catalogo' && styles.modeChipActive]}
                onPress={() => setModo('catalogo')}
              >
                <Text style={[styles.modeChipText, modo === 'catalogo' && styles.modeChipTextActive]}>
                  Manual (catálogo)
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeChip, modo === 'ia' && styles.modeChipActive]}
                onPress={() => setModo('ia')}
              >
                <Text style={[styles.modeChipText, modo === 'ia' && styles.modeChipTextActive]}>
                  Con IA
                </Text>
              </Pressable>
            </View>
          </HostPaperSection>

          {modo === 'catalogo' ? (
            <>
              <HostSectionKicker label="Servicios del catálogo" />
              <HostPaperSection style={styles.section}>
                {catalogoLoading ? (
                  <ActivityIndicator color={I.primary} style={{ marginVertical: SPACING.fixed.md }} />
                ) : serviciosDisponibles.length === 0 ? (
                  <Text style={styles.hint}>No hay servicios publicados en tu catálogo.</Text>
                ) : (
                  serviciosDisponibles.map((oferta, index) => {
                    const selected = Boolean(seleccionados[oferta.id]);
                    const nombre = oferta.servicio_info?.nombre || 'Servicio';
                    const precio =
                      oferta.desglose_precios?.precio_final_cliente
                      ?? oferta.precio_publicado_cliente;
                    const last = index === serviciosDisponibles.length - 1;
                    return (
                      <Pressable
                        key={oferta.id}
                        style={[
                          styles.servicioRow,
                          !last && styles.servicioRowBorder,
                          selected && styles.servicioRowSelected,
                        ]}
                        onPress={() => toggleServicio(oferta)}
                      >
                        <View style={styles.servicioTextCol}>
                          <Text style={styles.servicioNombre}>{nombre}</Text>
                          <Text style={styles.servicioPrecio}>{formatPrecio(precio)}</Text>
                        </View>
                        <View style={[styles.check, selected && styles.checkOn]}>
                          {selected ? <Text style={styles.checkMark}>✓</Text> : null}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </HostPaperSection>
            </>
          ) : (
            <>
              <HostSectionKicker label="Cotización con IA" />
              <HostPaperSection style={styles.section}>
                <View style={styles.fieldsStack}>
                  <InstitutionalField
                    label="Servicio a cotizar"
                    placeholder="Ej.: Cambio de filtro de aceite"
                    value={servicioIa}
                    onChangeText={setServicioIa}
                  />
                  <InstitutionalField
                    label="Detalle (opcional)"
                    multiline
                    placeholder="Contexto adicional para la IA"
                    value={descripcionIa}
                    onChangeText={setDescripcionIa}
                  />
                </View>
              </HostPaperSection>
            </>
          )}

          <InstitutionalButton
            label={enviando ? 'Creando borrador…' : 'Crear borrador para revisar'}
            variant="primary"
            onPress={() => void handleSubmit()}
            disabled={enviando}
            loading={enviando}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.fixed.lg,
  },
  scrollContent: {
    paddingTop: SPACING.fixed.sm,
  },
  section: {
    marginBottom: SPACING.fixed.sm,
  },
  fieldsStack: {
    gap: SPACING.fixed.md,
  },
  cardTitle: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  cardSub: {
    marginTop: SPACING.fixed.xs,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.tight),
    color: I.muted,
  },
  modeRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  modeChip: {
    flex: 1,
    minHeight: 48,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    borderColor: withOpacity(I.primary, 0.35),
    backgroundColor: withOpacity(I.primary, 0.08),
  },
  modeChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  modeChipTextActive: {
    color: I.primary,
    fontFamily: FF.sansSemiBold,
  },
  servicioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: SPACING.fixed.sm,
  },
  servicioRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  servicioRowSelected: {
    backgroundColor: withOpacity(I.primary, 0.06),
    marginHorizontal: -SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
  },
  servicioTextCol: { flex: 1, minWidth: 0 },
  servicioNombre: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  servicioPrecio: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: COLORS.background.paper,
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
    fontFamily: FF.sansSemiBold,
  },
  hint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },
  submitBtn: {
    marginTop: SPACING.fixed.md,
    alignSelf: 'stretch',
  },
  errorText: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.body,
    textAlign: 'center',
  },
});

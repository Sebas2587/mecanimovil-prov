import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { Link2, Sparkles, X } from 'lucide-react-native';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { CotizacionIaEditor } from '@/components/chats/CotizacionIaEditor';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
import { consultarPatente } from '@/services/vehiculoService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { showAlert } from '@/utils/platformAlert';

function extractApiError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const first = Object.values(data as Record<string, unknown>)[0];
      if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
      if (typeof first === 'string') return first;
    }
  }
  return fallback;
}

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

type Props = {
  visible: boolean;
  onClose: () => void;
  onEnviada?: () => void;
};

export function CotizacionLibreModal({ visible, onClose, onEnviada }: Props) {
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [vehiculoPatente, setVehiculoPatente] = useState('');
  const [vehiculoMarca, setVehiculoMarca] = useState('');
  const [vehiculoModelo, setVehiculoModelo] = useState('');
  const [vehiculoAnio, setVehiculoAnio] = useState('');
  const [vehiculoCilindraje, setVehiculoCilindraje] = useState('');
  const [vehiculoVin, setVehiculoVin] = useState('');
  const [servicioNombre, setServicioNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [modalidad, setModalidad] = useState<'taller' | 'domicilio'>('taller');
  const [buscandoPatente, setBuscandoPatente] = useState(false);
  const [patenteHint, setPatenteHint] = useState<string | null>(null);
  const [generandoIa, setGenerandoIa] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorIa, setErrorIa] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<CotizacionCanal | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const vehiculoPayload = useMemo(
    () => ({
      marca: vehiculoMarca.trim(),
      modelo: vehiculoModelo.trim(),
      patente: vehiculoPatente.trim().toUpperCase(),
      anio: vehiculoAnio.trim() ? parseInt(vehiculoAnio.trim(), 10) : undefined,
      cilindraje: vehiculoCilindraje.trim(),
      vin: vehiculoVin.trim().toUpperCase(),
    }),
    [vehiculoMarca, vehiculoModelo, vehiculoPatente, vehiculoAnio, vehiculoCilindraje, vehiculoVin],
  );

  const resetForm = useCallback(() => {
    setClienteNombre('');
    setClienteTelefono('');
    setVehiculoPatente('');
    setVehiculoMarca('');
    setVehiculoModelo('');
    setVehiculoAnio('');
    setVehiculoCilindraje('');
    setVehiculoVin('');
    setServicioNombre('');
    setDescripcion('');
    setModalidad('taller');
    setPatenteHint(null);
    setErrorIa(null);
    setCotizacion(null);
    setShareUrl(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handlePatenteBlur = useCallback(async () => {
    const patente = vehiculoPatente.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (patente.length < 5) {
      setPatenteHint(null);
      return;
    }
    setBuscandoPatente(true);
    setPatenteHint(null);
    try {
      const data = await consultarPatente(patente);
      setVehiculoPatente(data.patente || patente);
      setVehiculoMarca(data.marca_nombre?.trim() || '');
      setVehiculoModelo(data.modelo_nombre?.trim() || '');
      setVehiculoAnio(data.year ? String(data.year) : '');
      setVehiculoVin(data.vin?.trim() || '');
      setVehiculoCilindraje(data.cilindraje?.trim() || '');
      setPatenteHint('Datos del vehículo cargados desde la patente.');
    } catch {
      setPatenteHint('No se encontró la patente. Completa marca y modelo manualmente.');
    } finally {
      setBuscandoPatente(false);
    }
  }, [vehiculoPatente]);

  const validarAntesGenerar = useCallback((): string | null => {
    if (!clienteNombre.trim()) return 'Ingresa el nombre del cliente.';
    if (!vehiculoMarca.trim() || !vehiculoModelo.trim()) {
      return 'Completa los datos del vehículo (patente o marca y modelo).';
    }
    if (!servicioNombre.trim()) return 'Ingresa el nombre del servicio.';
    return null;
  }, [clienteNombre, vehiculoMarca, vehiculoModelo, servicioNombre]);

  const handleGenerarIa = useCallback(async () => {
    const err = validarAntesGenerar();
    if (err) {
      setErrorIa(err);
      return;
    }
    setErrorIa(null);
    setGenerandoIa(true);
    try {
      const res = await cotizacionCanalService.generarIa({
        cliente_nombre: clienteNombre.trim(),
        cliente_telefono: clienteTelefono.trim(),
        servicio_nombre: servicioNombre.trim(),
        descripcion_problema: descripcion.trim(),
        modalidad,
        vehiculo: vehiculoPayload,
      });
      if (!res.disponible || !res.cotizacion) {
        setErrorIa(res.error || 'No se pudo generar la cotización con IA.');
        return;
      }
      setCotizacion(res.cotizacion);
    } catch {
      setErrorIa('Error al generar cotización. Intenta de nuevo.');
    } finally {
      setGenerandoIa(false);
    }
  }, [
    validarAntesGenerar,
    clienteNombre,
    clienteTelefono,
    servicioNombre,
    descripcion,
    modalidad,
    vehiculoPayload,
  ]);

  const persistirCotizacion = useCallback(async (next: CotizacionCanal) => {
    setCotizacion(next);
    if (next.estado !== 'borrador' || !next.id) return next;
    try {
      const saved = await cotizacionCanalService.actualizar(next.id, {
        repuestos: next.repuestos,
        mano_obra_clp: next.mano_obra_clp,
        servicio_nombre: next.servicio_nombre,
        descripcion_problema: next.descripcion_problema,
        duracion_minutos_estimada: next.duracion_minutos_estimada,
      });
      setCotizacion(saved);
      return saved;
    } catch {
      return next;
    }
  }, []);

  const compartirLink = useCallback(async (url: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showAlert('Link copiado', 'Pégalo en WhatsApp u otro canal para el cliente.');
        return;
      }
      await Share.share({ message: url, url });
    } catch {
      showAlert('Link de cotización', url);
    }
  }, []);

  const handleEnviar = useCallback(async () => {
    if (!cotizacion?.id) return;
    setEnviando(true);
    setErrorIa(null);
    try {
      const saved = await persistirCotizacion(cotizacion);
      const res = await cotizacionCanalService.enviar(saved.id);
      const url = res.share_url || res.cotizacion.share_url || res.cotizacion.url_publica || null;
      setCotizacion(res.cotizacion);
      setShareUrl(url);
      onEnviada?.();
      if (url) {
        await compartirLink(url);
      } else {
        showAlert('Cotización enviada', 'Se generó la cotización libre.');
      }
    } catch (err) {
      setErrorIa(extractApiError(err, 'No se pudo generar el link de cotización.'));
    } finally {
      setEnviando(false);
    }
  }, [cotizacion, persistirCotizacion, compartirLink, onEnviada]);

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <InstitutionalText role="title" style={styles.title}>
            Cotización libre
          </InstitutionalText>
          <InstitutionalText role="caption" color="muted" style={styles.subtitle}>
            Genera un link público para compartir por cualquier canal
          </InstitutionalText>
        </View>
        <TouchableOpacity onPress={handleClose} accessibilityLabel="Cerrar">
          <X size={22} color={I.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!cotizacion ? (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Cliente</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre (obligatorio)"
                placeholderTextColor={I.mutedSoft}
                value={clienteNombre}
                onChangeText={setClienteNombre}
              />
              <TextInput
                style={[styles.input, styles.inputSpaced]}
                placeholder="Teléfono (opcional)"
                placeholderTextColor={I.mutedSoft}
                keyboardType="phone-pad"
                value={clienteTelefono}
                onChangeText={setClienteTelefono}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Vehículo</Text>
              <TextInput
                style={styles.input}
                placeholder="Patente"
                placeholderTextColor={I.mutedSoft}
                autoCapitalize="characters"
                value={vehiculoPatente}
                onChangeText={(t) => setVehiculoPatente(t.toUpperCase())}
                onBlur={() => void handlePatenteBlur()}
              />
              {buscandoPatente ? (
                <ActivityIndicator size="small" color={I.primary} style={styles.hintLoader} />
              ) : patenteHint ? (
                <Text style={styles.hint}>{patenteHint}</Text>
              ) : null}
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder="Marca"
                  placeholderTextColor={I.mutedSoft}
                  value={vehiculoMarca}
                  onChangeText={setVehiculoMarca}
                />
                <TextInput
                  style={[styles.input, styles.flex, styles.inputSpacedLeft]}
                  placeholder="Modelo"
                  placeholderTextColor={I.mutedSoft}
                  value={vehiculoModelo}
                  onChangeText={setVehiculoModelo}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Servicio</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Cambio de aceite y filtros"
                placeholderTextColor={I.mutedSoft}
                value={servicioNombre}
                onChangeText={setServicioNombre}
              />
              <TextInput
                style={[styles.input, styles.textArea, styles.inputSpaced]}
                placeholder="Detalle del problema (opcional)"
                placeholderTextColor={I.mutedSoft}
                multiline
                value={descripcion}
                onChangeText={setDescripcion}
              />
              <View style={styles.modalidadRow}>
                {(['taller', 'domicilio'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modalidadChip, modalidad === m && styles.modalidadChipActive]}
                    onPress={() => setModalidad(m)}
                  >
                    <Text
                      style={[
                        styles.modalidadChipText,
                        modalidad === m && styles.modalidadChipTextActive,
                      ]}
                    >
                      {m === 'taller' ? 'En taller' : 'A domicilio'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {errorIa ? <Text style={styles.error}>{errorIa}</Text> : null}

            <InstitutionalButton
              label={generandoIa ? 'Generando…' : 'Generar cotización con IA'}
              onPress={() => void handleGenerarIa()}
              disabled={generandoIa}
              loading={generandoIa}
              leading={<Sparkles size={18} color={I.onPrimary} />}
            />
          </>
        ) : (
          <>
            <CotizacionIaEditor
              cotizacion={cotizacion}
              onChange={(next) => void persistirCotizacion(next)}
              onEnviar={() => void handleEnviar()}
              enviarLabel="Generar link y compartir"
              enviando={enviando}
              readonly={cotizacion.estado !== 'borrador'}
            />

            {shareUrl ? (
              <View style={styles.shareBox}>
                <View style={styles.shareHeader}>
                  <Link2 size={18} color={I.primary} />
                  <Text style={styles.shareTitle}>Link público</Text>
                </View>
                <Text style={styles.shareUrl} selectable>
                  {shareUrl}
                </Text>
                <InstitutionalButton
                  label="Copiar link"
                  variant="secondary"
                  onPress={() => void compartirLink(shareUrl)}
                />
              </View>
            ) : null}

            {errorIa ? <Text style={styles.error}>{errorIa}</Text> : null}
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  headerText: { flex: 1, paddingRight: SPACING.sm },
  title: { marginBottom: 2 },
  subtitle: { color: I.muted },
  scroll: { maxHeight: '85%' },
  scrollContent: { paddingBottom: SPACING.xl, gap: SPACING.md },
  section: { gap: SPACING.xs },
  label: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    marginBottom: 2,
  },
  input: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  inputSpaced: { marginTop: SPACING.xs },
  inputSpacedLeft: { marginLeft: SPACING.xs },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', marginTop: SPACING.xs },
  flex: { flex: 1 },
  hint: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
    marginTop: 4,
  },
  hintLoader: { marginTop: 4, alignSelf: 'flex-start' },
  modalidadRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm },
  modalidadChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
  },
  modalidadChipActive: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  modalidadChipText: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
  },
  modalidadChipTextActive: { color: I.onPrimary },
  error: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.error.dark,
  },
  shareBox: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: SPACING.sm,
  },
  shareHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  shareTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  shareUrl: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
  },
});

export default CotizacionLibreModal;

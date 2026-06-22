import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useOnboardingDraft } from '@/context/OnboardingDraftContext';
import { buildOnboardingHref, mergeRouteParamsIntoDraft } from '@/utils/onboardingDraftParams';
import OnboardingHeader from '@/components/OnboardingHeader';
import {
  OnboardingScreenLayout,
  OnboardingPrimaryButton,
  OnboardingNotice,
} from '@/components/onboarding';
import { COLORS } from '@/app/design-system/tokens';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';

const I = COLORS.institutional;
import { authAPI } from '@/services/api';
import {
  mergeRutCompactInput,
  formatRutForDisplay,
  rutCompactoEsValido,
} from '@/utils/chileRut';
import { showAlert } from '@/utils/platformAlert';
import {
  mergeNineMobileDigits,
  telefonoCompletoDesdeNacional,
  telefonoMovilChileValido,
  extraerNueveDigitosDesdeGuardado,
} from '@/utils/chilePhone';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import ChileAddressField from '@/components/forms/ChileAddressField';
import type { ChileFormattedAddress } from '@/utils/chileAddressSearch';

const DEBOUNCE_MS = 500;

type RemotoEstado = 'idle' | 'checking' | 'free' | 'taken' | 'error';

function normalizarTipoParam(tipo: string | string[] | undefined): string {
  if (tipo === undefined || tipo === null) return '';
  return Array.isArray(tipo) ? String(tipo[0] ?? '') : String(tipo);
}

function mensajeRutLocal(compact: string): string | null {
  if (!compact) return null;
  if (compact.length < 2) return 'Ingresa tu RUT y el dígito verificador.';
  if (!rutCompactoEsValido(compact)) return 'Revisa el número y el dígito verificador (módulo 11).';
  return null;
}

export default function InformacionBasicaScreen() {
  const params = useLocalSearchParams();
  const { tipo } = params;
  const router = useRouter();
  const { usuario } = useAuth();
  const { draft, patchDraft } = useOnboardingDraft();

  const tipoStr = useMemo(() => {
    const fromParam = normalizarTipoParam(tipo);
    // Unificación: todo proveedor es taller; el param legacy 'mecanico' ya no aplica.
    return fromParam === 'mecanico' ? 'taller' : fromParam || 'taller';
  }, [tipo]);
  const esTaller = true;

  // Modalidad de atención (en_taller / a_domicilio / ambas). Unificación: todo proveedor
  // es taller; la dirección física solo es obligatoria si atiende en local (en_taller/ambas).
  const modalidadStr = useMemo(() => {
    const fromParam = normalizarTipoParam(params.modalidad_atencion);
    return fromParam || draft.modalidad_atencion || '';
  }, [params.modalidad_atencion, draft.modalidad_atencion]);
  const soloDomicilio = modalidadStr === 'a_domicilio';
  const requiereDireccion = esTaller && !soloDomicilio;

  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    descripcion: '',
    experiencia_anos: '',
  });

  const [rutCompact, setRutCompact] = useState('');
  const [dniCompact, setDniCompact] = useState('');
  const [telefonoNacional, setTelefonoNacional] = useState('');
  const [verificando, setVerificando] = useState(false);

  const [rutRemoto, setRutRemoto] = useState<RemotoEstado>('idle');
  const [rutRemotoMsg, setRutRemotoMsg] = useState('');
  const [telRemoto, setTelRemoto] = useState<RemotoEstado>('idle');
  const [telRemotoMsg, setTelRemotoMsg] = useState('');
  const [direccionValidada, setDireccionValidada] = useState<ChileFormattedAddress | null>(null);

  const rutVerifySeq = useRef(0);
  const telVerifySeq = useRef(0);

  const docCompact = esTaller ? rutCompact : dniCompact;

  const hydrateFromDraft = useCallback(() => {
    const merged = { ...draft, ...mergeRouteParamsIntoDraft(draft, params as Record<string, string | string[] | undefined>) };
    if (merged.tipo && merged.tipo !== tipoStr) {
      // tipo viene por param; no sobrescribir pantalla si difiere
    }
    if (merged.nombre) {
      setFormData((prev) => ({
        ...prev,
        nombre: merged.nombre || prev.nombre,
        descripcion: merged.descripcion || prev.descripcion,
        direccion: merged.direccion || prev.direccion,
        experiencia_anos: merged.experiencia_anos || prev.experiencia_anos,
      }));
    } else if (merged.descripcion || merged.direccion || merged.experiencia_anos) {
      setFormData((prev) => ({
        ...prev,
        descripcion: merged.descripcion || prev.descripcion,
        direccion: merged.direccion || prev.direccion,
        experiencia_anos: merged.experiencia_anos || prev.experiencia_anos,
      }));
    }
    if (merged.rut) {
      setRutCompact(mergeRutCompactInput(merged.rut.replace(/[.\-\s]/g, '')));
    }
    if (merged.dni) {
      setDniCompact(mergeRutCompactInput(merged.dni.replace(/[.\-\s]/g, '')));
    }
    const nueve = extraerNueveDigitosDesdeGuardado(merged.telefono);
    if (nueve) setTelefonoNacional(nueve);
    if (merged.direccion && merged.direccion_lat && merged.direccion_lng) {
      const lat = parseFloat(merged.direccion_lat);
      const lon = parseFloat(merged.direccion_lng);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setDireccionValidada({
          line: merged.direccion,
          lat,
          lon,
          comuna: merged.comuna || '',
          region: merged.region || '',
        });
      }
    }
  }, [draft, params, tipoStr]);

  useFocusEffect(
    useCallback(() => {
      hydrateFromDraft();
    }, [hydrateFromDraft]),
  );

  useEffect(() => {
    try {
      if (draft.nombre || draft.telefono) return;
      if (usuario) {
        const nombreCompleto = usuario?.first_name
          ? `${usuario.first_name}${usuario?.last_name ? ` ${usuario.last_name}` : ''}`.trim()
          : '';

        setFormData((prev) => ({
          ...prev,
          nombre: nombreCompleto || prev.nombre || '',
        }));

        const nueve = extraerNueveDigitosDesdeGuardado(usuario?.telefono);
        if (nueve) {
          setTelefonoNacional(nueve);
        }
      }
    } catch (error) {
      console.error('Error pre-llenando datos del usuario:', error);
    }
  }, [usuario, draft.nombre, draft.telefono]);

  const handleInputChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const onRutChange = useCallback((text: string) => {
    setRutCompact(mergeRutCompactInput(text));
  }, []);

  const onDniChange = useCallback((text: string) => {
    setDniCompact(mergeRutCompactInput(text));
  }, []);

  /** Campos obligatorios locales (sin depender del estado remoto aún). */
  const camposLocalesCompletos = useMemo(() => {
    if (!formData.nombre.trim()) return false;
    if (!formData.descripcion.trim()) return false;
    if (!telefonoMovilChileValido(telefonoNacional)) return false;
    if (!rutCompactoEsValido(docCompact)) return false;

    if (esTaller) {
      // La dirección física solo es obligatoria si atiende en local (en_taller/ambas).
      if (requiereDireccion && !direccionValidada?.line?.trim()) return false;
    } else {
      if (!formData.experiencia_anos.trim()) return false;
      const exp = parseInt(formData.experiencia_anos, 10);
      if (Number.isNaN(exp) || exp < 0) return false;
    }
    return true;
  }, [formData, telefonoNacional, docCompact, esTaller, direccionValidada, requiereDireccion]);

  const puedeContinuar = useMemo(() => {
    if (!tipoStr) return false;
    return (
      camposLocalesCompletos &&
      rutRemoto === 'free' &&
      telRemoto === 'free' &&
      !verificando
    );
  }, [tipoStr, camposLocalesCompletos, rutRemoto, telRemoto, verificando]);

  useEffect(() => {
    const msgLocal = mensajeRutLocal(docCompact);
    if (msgLocal) {
      setRutRemoto('idle');
      setRutRemotoMsg('');
      return;
    }
    if (!rutCompactoEsValido(docCompact)) {
      setRutRemoto('idle');
      setRutRemotoMsg('');
      return;
    }

    const seq = ++rutVerifySeq.current;
    setRutRemoto('checking');
    setRutRemotoMsg('Verificando RUT…');

    const timer = setTimeout(async () => {
      try {
        const valor = formatRutForDisplay(docCompact);
        const res = await authAPI.verificarDatosOnboarding({
          tipo: 'rut',
          valor,
          contexto: 'taller',
        });
        if (seq !== rutVerifySeq.current) return;
        const data = res.data as { disponible?: boolean; mensaje?: string };
        if (!data.disponible) {
          setRutRemoto('taken');
          setRutRemotoMsg(data.mensaje || 'Este RUT ya está registrado en el sistema.');
        } else {
          setRutRemoto('free');
          setRutRemotoMsg('Este RUT está disponible.');
        }
      } catch (e: any) {
        if (seq !== rutVerifySeq.current) return;
        setRutRemoto('error');
        setRutRemotoMsg(
          e.response?.data?.mensaje ||
            e.response?.data?.error ||
            e.response?.data?.detail ||
            'No se pudo verificar el RUT. Revisa tu conexión.'
        );
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [docCompact, tipoStr, esTaller]);

  useEffect(() => {
    if (!telefonoMovilChileValido(telefonoNacional)) {
      setTelRemoto('idle');
      setTelRemotoMsg('');
      return;
    }

    const seq = ++telVerifySeq.current;
    setTelRemoto('checking');
    setTelRemotoMsg('Verificando teléfono…');

    const timer = setTimeout(async () => {
      try {
        const valor = telefonoCompletoDesdeNacional(telefonoNacional);
        const res = await authAPI.verificarDatosOnboarding({
          tipo: 'telefono',
          valor,
          contexto: 'taller',
        });
        if (seq !== telVerifySeq.current) return;
        const data = res.data as { disponible?: boolean; mensaje?: string };
        if (!data.disponible) {
          setTelRemoto('taken');
          setTelRemotoMsg(data.mensaje || 'Este número ya está registrado.');
        } else {
          setTelRemoto('free');
          setTelRemotoMsg('Número disponible.');
        }
      } catch (e: any) {
        if (seq !== telVerifySeq.current) return;
        setTelRemoto('error');
        setTelRemotoMsg(
          e.response?.data?.mensaje ||
            e.response?.data?.error ||
            e.response?.data?.detail ||
            'No se pudo verificar el teléfono. Revisa tu conexión.'
        );
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [telefonoNacional, tipoStr]);

  const renderFeedback = (estado: RemotoEstado, mensaje: string, localMsg: string | null) => {
    if (localMsg) {
      return (
        <View style={styles.feedbackRow}>
          <InstitutionalIcon name="alert-circle-outline" size={16} color="#C0392B"  strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.feedbackTextWarn}>{localMsg}</Text>
        </View>
      );
    }
    if (estado === 'idle' || !mensaje) return null;
    if (estado === 'checking') {
      return (
        <View style={styles.feedbackRow}>
          <ActivityIndicator size="small" color="#4E4FEB" />
          <Text style={styles.feedbackTextMuted}>{mensaje}</Text>
        </View>
      );
    }
    if (estado === 'free') {
      return (
        <View style={styles.feedbackRow}>
          <InstitutionalIcon name="checkmark-circle" size={16} color="#27AE60"  strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.feedbackTextOk}>{mensaje}</Text>
        </View>
      );
    }
    return (
      <View style={styles.feedbackRow}>
        <InstitutionalIcon name="close-circle" size={16} color="#C0392B"  strokeWidth={ICON_STROKE_WIDTH} />
        <Text style={styles.feedbackTextErr}>{mensaje}</Text>
      </View>
    );
  };

  const getBackPath = () => buildOnboardingHref('/(onboarding)/tipo-cuenta', draft);

  const handleContinuar = async () => {
    if (!puedeContinuar) return;

    if (!tipoStr) {
      showAlert('Error', 'Tipo de proveedor no válido. Por favor, vuelve al inicio.');
      router.replace('/(onboarding)/tipo-cuenta');
      return;
    }

    setVerificando(true);
    try {
      const docFormatted = formatRutForDisplay(docCompact);
      const telCompleto = telefonoCompletoDesdeNacional(telefonoNacional);

      const [resDoc, resTel] = await Promise.all([
        authAPI.verificarDatosOnboarding({
          tipo: 'rut',
          valor: docFormatted,
          contexto: tipoStr,
        }),
        authAPI.verificarDatosOnboarding({
          tipo: 'telefono',
          valor: telCompleto,
          contexto: tipoStr,
        }),
      ]);

      const dataDoc = resDoc.data as { disponible?: boolean; mensaje?: string };
      const dataTel = resTel.data as { disponible?: boolean; mensaje?: string };

      if (!dataDoc.disponible) {
        setRutRemoto('taken');
        setRutRemotoMsg(dataDoc.mensaje || 'Este RUT ya está registrado.');
        showAlert('Documento ya registrado', dataDoc.mensaje || 'Este RUT ya está registrado.');
        return;
      }
      if (!dataTel.disponible) {
        setTelRemoto('taken');
        setTelRemotoMsg(dataTel.mensaje || 'Este número ya está registrado.');
        showAlert('Teléfono no disponible', dataTel.mensaje || 'Este número ya está registrado.');
        return;
      }

      const paramsParaEnviar: Record<string, string> = {
        tipo: tipoStr,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        telefono: telCompleto,
      };
      if (modalidadStr) {
        paramsParaEnviar.modalidad_atencion = modalidadStr;
      }

      if (tipoStr === 'taller') {
        // La dirección física solo es obligatoria si atiende en local (en_taller/ambas).
        if (requiereDireccion && !direccionValidada) {
          showAlert(
            'Dirección no confirmada',
            'Selecciona una dirección de la lista para validar comuna y región en Chile.'
          );
          return;
        }
        paramsParaEnviar.rut = docFormatted;
        if (direccionValidada) {
          paramsParaEnviar.direccion = direccionValidada.line;
          paramsParaEnviar.direccion_lat = String(direccionValidada.lat);
          paramsParaEnviar.direccion_lng = String(direccionValidada.lon);
          paramsParaEnviar.comuna = direccionValidada.comuna;
          paramsParaEnviar.region = direccionValidada.region;
        }
      } else {
        paramsParaEnviar.dni = docFormatted;
        paramsParaEnviar.experiencia_anos = formData.experiencia_anos.trim();
      }

      patchDraft({
        tipo: tipoStr,
        modalidad_atencion: (modalidadStr || undefined) as any,
        nombre: paramsParaEnviar.nombre,
        descripcion: paramsParaEnviar.descripcion,
        telefono: paramsParaEnviar.telefono,
        rut: paramsParaEnviar.rut ?? '',
        dni: paramsParaEnviar.dni ?? '',
        direccion: paramsParaEnviar.direccion ?? '',
        direccion_lat: paramsParaEnviar.direccion_lat ?? '',
        direccion_lng: paramsParaEnviar.direccion_lng ?? '',
        comuna: paramsParaEnviar.comuna ?? '',
        region: paramsParaEnviar.region ?? '',
        experiencia_anos: paramsParaEnviar.experiencia_anos ?? '',
      });

      router.push({
        pathname: '/(onboarding)/cobertura-marcas' as any,
        params: paramsParaEnviar,
      });
    } catch (e: any) {
      const msg =
        e.response?.data?.mensaje ||
        e.response?.data?.error ||
        e.response?.data?.detail ||
        'No se pudo confirmar los datos. Intenta de nuevo.';
      showAlert('Error', msg);
    } finally {
      setVerificando(false);
    }
  };

  const inputTelStyle = useMemo(() => {
    if (!telefonoNacional) return [styles.phoneRow];
    if (!telefonoMovilChileValido(telefonoNacional)) return [styles.phoneRow, styles.inputBorderWarn];
    if (telRemoto === 'taken' || telRemoto === 'error') return [styles.phoneRow, styles.inputBorderErr];
    if (telRemoto === 'free') return [styles.phoneRow, styles.inputBorderOk];
    return [styles.phoneRow];
  }, [telefonoNacional, telRemoto]);

  const renderTelefonoInput = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Teléfono de contacto *</Text>
      <Text style={styles.hint}>Ingresa solo los 9 dígitos de tu móvil (comienza en 9).</Text>
      <View style={inputTelStyle}>
        <Text style={styles.phonePrefix}>+56 </Text>
        <TextInput
          style={styles.phoneInput}
          value={telefonoNacional}
          onChangeText={(t) => setTelefonoNacional(mergeNineMobileDigits(t))}
          placeholder="912345678"
          placeholderTextColor="#95a5a6"
          keyboardType="number-pad"
          maxLength={9}
        />
      </View>
      {renderFeedback(telRemoto, telRemotoMsg, !telefonoNacional ? null : !telefonoMovilChileValido(telefonoNacional) ? 'Debe ser un móvil de 9 dígitos que comience en 9.' : null)}
    </View>
  );

  const renderRutBlock = (valueCompact: string, onChange: (t: string) => void, label: string) => {
    const local = mensajeRutLocal(valueCompact);
    const rutInputStyle = (() => {
      const localErr = mensajeRutLocal(valueCompact);
      if (localErr) return [styles.input, styles.inputBorderWarn];
      if (rutRemoto === 'taken' || rutRemoto === 'error') return [styles.input, styles.inputBorderErr];
      if (rutRemoto === 'free') return [styles.input, styles.inputBorderOk];
      return [styles.input];
    })();
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>
          Puedes ingresar el RUT con o sin puntos. Con cuerpo de 7 dígitos basta el dígito verificador (8
          caracteres); si el cuerpo tiene 8 dígitos, el verificador es el noveno. Debe cumplir módulo 11.
        </Text>
        <TextInput
          style={rutInputStyle}
          value={formatRutForDisplay(valueCompact)}
          onChangeText={onChange}
          placeholder="Ej. 12.345.678-9"
          placeholderTextColor="#95a5a6"
          keyboardType="default"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {renderFeedback(rutRemoto, rutRemotoMsg, local)}
      </View>
    );
  };

  const renderTallerForm = () => (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {soloDomicilio ? 'Nombre del negocio *' : 'Nombre del Taller *'}
        </Text>
        <TextInput
          style={styles.input}
          value={formData.nombre}
          onChangeText={(value) => handleInputChange('nombre', value)}
          placeholder={soloDomicilio ? 'Ej. Mecánica Express a domicilio' : 'Ej. Taller Mecánico San Juan'}
          placeholderTextColor="#95a5a6"
        />
      </View>

      {renderRutBlock(rutCompact, onRutChange, 'RUT/CUIT/ID Fiscal *')}

      <ChileAddressField
        label={soloDomicilio ? 'Dirección base (opcional)' : 'Dirección del taller *'}
        hint={
          soloDomicilio
            ? 'Como atiendes solo a domicilio, la dirección es opcional. Define tu zona de cobertura más adelante.'
            : 'Escribe calle y número; elige un resultado con comuna y región en Chile.'
        }
        value={formData.direccion}
        validated={direccionValidada}
        onChangeText={(value) => handleInputChange('direccion', value)}
        onValidatedChange={setDireccionValidada}
      />

      {renderTelefonoInput()}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Descripción del Servicio *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.descripcion}
          onChangeText={(value) => handleInputChange('descripcion', value)}
          placeholder="Describe brevemente los servicios que ofrece tu taller..."
          placeholderTextColor="#95a5a6"
          multiline
          numberOfLines={3}
        />
      </View>
    </>
  );

  const renderMecanicoForm = () => (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nombre Completo *</Text>
        <TextInput
          style={styles.input}
          value={formData.nombre}
          onChangeText={(value) => handleInputChange('nombre', value)}
          placeholder="Ej: Juan Carlos Pérez"
          placeholderTextColor="#95a5a6"
        />
      </View>

      {renderRutBlock(dniCompact, onDniChange, 'DNI/RUT Personal *')}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Años de Experiencia *</Text>
        <TextInput
          style={styles.input}
          value={formData.experiencia_anos}
          onChangeText={(value) => handleInputChange('experiencia_anos', value)}
          placeholder="Ej: 5"
          placeholderTextColor="#95a5a6"
          keyboardType="numeric"
        />
      </View>

      {renderTelefonoInput()}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Descripción de tu Experiencia *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.descripcion}
          onChangeText={(value) => handleInputChange('descripcion', value)}
          placeholder="Describe tu experiencia, tipos de vehículos que atiendes..."
          placeholderTextColor="#95a5a6"
          multiline
          numberOfLines={3}
        />
      </View>
    </>
  );

  if (!tipoStr) {
    return (
      <OnboardingScreenLayout>
        <View style={onboardingStyles.loadingCenter}>
          <ActivityIndicator size="large" color={I.primary} />
          <Text style={onboardingStyles.loadingText}>Cargando…</Text>
        </View>
      </OnboardingScreenLayout>
    );
  }

  return (
    <OnboardingScreenLayout
      keyboardAvoiding
      footer={
        <OnboardingPrimaryButton
          label={puedeContinuar ? 'Continuar' : 'Completa y valida los datos'}
          onPress={handleContinuar}
          disabled={!puedeContinuar}
          loading={verificando}
          loadingLabel="Validando…"
        />
      }
    >
      <OnboardingHeader
        title="Datos de tu taller"
        subtitle={
          soloDomicilio
            ? 'Completa la información de tu taller (operas solo a domicilio)'
            : 'Completa la información básica de tu taller'
        }
        currentStep={2}
        totalSteps={5}
        canGoBack
        backPath={getBackPath()}
        icon="business-outline"
      />

      <View style={styles.form}>
        <OnboardingNotice>
          {soloDomicilio
            ? 'Los campos con * son obligatorios. La dirección es opcional porque atiendes solo a domicilio.'
            : 'Los campos con * son obligatorios. RUT y teléfono se validan en tiempo real antes de continuar.'}
        </OnboardingNotice>
        {renderTallerForm()}
      </View>
    </OnboardingScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    ...onboardingStyles.panel,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: onboardingStyles.label,
  hint: {
    fontSize: 12,
    color: I.mutedSoft,
    marginBottom: 8,
  },
  input: onboardingStyles.input,
  inputBorderWarn: {
    borderColor: '#F5B041',
    borderWidth: 1.5,
  },
  inputBorderErr: {
    borderColor: '#E74C3C',
    borderWidth: 1.5,
  },
  inputBorderOk: {
    borderColor: I.semanticUp,
    borderWidth: 1.5,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: 12,
    backgroundColor: I.canvas,
    paddingHorizontal: 12,
  },
  phonePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: I.body,
    marginRight: 4,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: I.ink,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  feedbackTextMuted: {
    fontSize: 13,
    color: '#666666',
    flex: 1,
  },
  feedbackTextOk: {
    fontSize: 13,
    color: '#27AE60',
    fontWeight: '600',
    flex: 1,
  },
  feedbackTextErr: {
    fontSize: 13,
    color: '#C0392B',
    flex: 1,
  },
  feedbackTextWarn: {
    fontSize: 13,
    color: '#A04000',
    flex: 1,
  },
});

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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import OnboardingHeader from '@/components/OnboardingHeader';
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
  const { tipo } = useLocalSearchParams();
  const router = useRouter();
  const { usuario } = useAuth();

  const tipoStr = useMemo(() => normalizarTipoParam(tipo), [tipo]);
  const esTaller = tipoStr === 'taller';

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

  const rutVerifySeq = useRef(0);
  const telVerifySeq = useRef(0);

  const docCompact = esTaller ? rutCompact : dniCompact;

  useEffect(() => {
    try {
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
  }, [usuario]);

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
      if (!formData.direccion.trim()) return false;
    } else {
      if (!formData.experiencia_anos.trim()) return false;
      const exp = parseInt(formData.experiencia_anos, 10);
      if (Number.isNaN(exp) || exp < 0) return false;
    }
    return true;
  }, [formData, telefonoNacional, docCompact, esTaller]);

  const puedeContinuar = useMemo(() => {
    if (!tipoStr || (tipoStr !== 'taller' && tipoStr !== 'mecanico')) return false;
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
          contexto: tipoStr === 'mecanico' ? 'mecanico' : 'taller',
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
          contexto: tipoStr === 'mecanico' ? 'mecanico' : 'taller',
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

  const getBackPath = () => `/(onboarding)/tipo-cuenta`;

  const handleContinuar = async () => {
    if (!puedeContinuar) return;

    if (!tipoStr || (tipoStr !== 'taller' && tipoStr !== 'mecanico')) {
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

      if (tipoStr === 'taller') {
        paramsParaEnviar.rut = docFormatted;
        paramsParaEnviar.direccion = formData.direccion.trim();
      } else {
        paramsParaEnviar.dni = docFormatted;
        paramsParaEnviar.experiencia_anos = formData.experiencia_anos.trim();
      }

      router.push({
        pathname: '/(onboarding)/marcas' as any,
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
        <Text style={styles.label}>Nombre del Taller *</Text>
        <TextInput
          style={styles.input}
          value={formData.nombre}
          onChangeText={(value) => handleInputChange('nombre', value)}
          placeholder="Ej. Taller Mecánico San Juan"
          placeholderTextColor="#95a5a6"
        />
      </View>

      {renderRutBlock(rutCompact, onRutChange, 'RUT/CUIT/ID Fiscal *')}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Dirección del Taller *</Text>
        <TextInput
          style={styles.input}
          value={formData.direccion}
          onChangeText={(value) => handleInputChange('direccion', value)}
          placeholder="Dirección completa donde está ubicado tu taller"
          placeholderTextColor="#95a5a6"
          multiline
          numberOfLines={2}
        />
      </View>

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

  if (!tipoStr || (tipoStr !== 'taller' && tipoStr !== 'mecanico')) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingTipo}>
          <ActivityIndicator size="large" color="#4E4FEB" />
          <Text style={styles.loadingTipoText}>Cargando…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.contentWrapper}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          <OnboardingHeader
            title={`Información de tu ${esTaller ? 'taller' : 'servicio'}`}
            subtitle="Completa la información básica para continuar"
            currentStep={2}
            totalSteps={5}
            canGoBack={true}
            backPath={getBackPath()}
            icon={esTaller ? 'business-outline' : 'car-sport-outline'}
          />

          <View style={styles.form}>
            <View style={styles.infoContainer}>
              <InstitutionalIcon name="information-circle" size={20} color="#4E4FEB"  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.infoText}>
                Los campos con * son obligatorios. RUT y teléfono se validan en tiempo real antes de continuar.
              </Text>
            </View>
            {esTaller ? renderTallerForm() : renderMecanicoForm()}
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.fixedButtonContainer}>
          <TouchableOpacity
            style={[styles.continuarButton, (!puedeContinuar || verificando) && styles.buttonDisabled]}
            onPress={handleContinuar}
            disabled={!puedeContinuar || verificando}
            activeOpacity={0.8}
          >
            {verificando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continuarButtonText}>
                {puedeContinuar ? 'Continuar' : 'Completa y valida los datos'}
              </Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 24,
  },
  loadingTipo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingTipoText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666666',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    color: '#000000',
  },
  inputBorderWarn: {
    borderColor: '#F5B041',
    borderWidth: 1.5,
  },
  inputBorderErr: {
    borderColor: '#E74C3C',
    borderWidth: 1.5,
  },
  inputBorderOk: {
    borderColor: '#27AE60',
    borderWidth: 1.5,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 12,
  },
  phonePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginRight: 4,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  fixedButtonContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  continuarButton: {
    backgroundColor: '#4E4FEB',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  continuarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    backgroundColor: '#D0D0D0',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E6F5FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
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

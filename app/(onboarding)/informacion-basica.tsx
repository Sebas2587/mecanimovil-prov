import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import OnboardingHeader from '@/components/OnboardingHeader';
import { authAPI } from '@/services/api';
import {
  mergeRutCompactInput,
  formatRutForDisplay,
  rutCompactoEsValido,
} from '@/utils/chileRut';
import {
  mergeNineMobileDigits,
  telefonoCompletoDesdeNacional,
  telefonoMovilChileValido,
  extraerNueveDigitosDesdeGuardado,
} from '@/utils/chilePhone';

export default function InformacionBasicaScreen() {
  const { tipo } = useLocalSearchParams();
  const router = useRouter();
  const { usuario } = useAuth();

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

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const onRutChange = (text: string) => {
    setRutCompact(mergeRutCompactInput(text));
  };

  const onDniChange = (text: string) => {
    setDniCompact(mergeRutCompactInput(text));
  };

  const tipoStrForValidation = Array.isArray(tipo) ? tipo[0] : tipo;
  const esTaller = tipoStrForValidation === 'taller';

  const isFormValid = () => {
    if (!formData.nombre.trim()) return false;
    if (!formData.descripcion.trim()) return false;
    if (!telefonoMovilChileValido(telefonoNacional)) return false;

    if (esTaller) {
      if (rutCompact.length !== 9 || !rutCompactoEsValido(rutCompact)) return false;
      if (!formData.direccion.trim()) return false;
    } else {
      if (dniCompact.length !== 9 || !rutCompactoEsValido(dniCompact)) return false;
      if (!formData.experiencia_anos.trim()) return false;
      const experiencia = parseInt(formData.experiencia_anos, 10);
      if (Number.isNaN(experiencia) || experiencia < 0) return false;
    }

    return true;
  };

  const validateSyncLocal = (): boolean => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return false;
    }
    if (!formData.descripcion.trim()) {
      Alert.alert('Error', 'La descripción es requerida');
      return false;
    }

    if (!telefonoMovilChileValido(telefonoNacional)) {
      Alert.alert(
        'Teléfono inválido',
        'Ingresa los 9 dígitos de tu número móvil chileno (debe comenzar en 9).'
      );
      return false;
    }

    if (esTaller) {
      if (rutCompact.length !== 9) {
        Alert.alert('RUT incompleto', 'Ingresa el RUT completo con dígito verificador.');
        return false;
      }
      if (!rutCompactoEsValido(rutCompact)) {
        Alert.alert('RUT inválido', 'Verifica el número y el dígito verificador.');
        return false;
      }
      if (!formData.direccion.trim()) {
        Alert.alert('Error', 'La dirección es requerida para ubicar tu taller');
        return false;
      }
    } else {
      if (dniCompact.length !== 9) {
        Alert.alert('RUT incompleto', 'Ingresa tu RUT completo con dígito verificador.');
        return false;
      }
      if (!rutCompactoEsValido(dniCompact)) {
        Alert.alert('RUT inválido', 'Verifica el número y el dígito verificador.');
        return false;
      }
      if (!formData.experiencia_anos.trim()) {
        Alert.alert('Error', 'Los años de experiencia son requeridos');
        return false;
      }
      const experiencia = parseInt(formData.experiencia_anos, 10);
      if (Number.isNaN(experiencia) || experiencia < 0) {
        Alert.alert('Error', 'Ingrese un número válido de años de experiencia');
        return false;
      }
    }

    return true;
  };

  const getBackPath = () => {
    return `/(onboarding)/tipo-cuenta`;
  };

  const handleContinuar = async () => {
    if (!validateSyncLocal()) return;

    const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
    if (!tipoStr || (tipoStr !== 'taller' && tipoStr !== 'mecanico')) {
      Alert.alert('Error', 'Tipo de proveedor no válido. Por favor, vuelve al inicio.');
      router.replace('/(onboarding)/tipo-cuenta');
      return;
    }

    const docFormatted =
      tipoStr === 'taller' ? formatRutForDisplay(rutCompact) : formatRutForDisplay(dniCompact);
    const telCompleto = telefonoCompletoDesdeNacional(telefonoNacional);

    setVerificando(true);
    try {
      try {
        const resDoc = await authAPI.verificarDatosOnboarding({
          tipo: 'rut',
          valor: docFormatted,
          contexto: tipoStr,
        });
        const dataDoc = resDoc.data as {
          disponible?: boolean;
          mensaje?: string;
        };
        if (!dataDoc.disponible) {
          Alert.alert(
            'Documento ya registrado',
            dataDoc.mensaje || 'Este RUT ya está registrado en el sistema.'
          );
          return;
        }
      } catch (e: any) {
        const msg =
          e.response?.data?.mensaje ||
          e.response?.data?.error ||
          e.response?.data?.detail ||
          'No se pudo validar el RUT.';
        Alert.alert('Validación de RUT', msg);
        return;
      }

      try {
        const resTel = await authAPI.verificarDatosOnboarding({
          tipo: 'telefono',
          valor: telCompleto || '',
          contexto: tipoStr,
        });
        const dataTel = resTel.data as {
          disponible?: boolean;
          mensaje?: string;
        };
        if (!dataTel.disponible) {
          Alert.alert(
            'Teléfono no disponible',
            dataTel.mensaje || 'Este número ya está registrado en el sistema.'
          );
          return;
        }
      } catch (e: any) {
        const msg =
          e.response?.data?.mensaje ||
          e.response?.data?.error ||
          e.response?.data?.detail ||
          'No se pudo validar el teléfono.';
        Alert.alert('Validación de teléfono', msg);
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
    } finally {
      setVerificando(false);
    }
  };

  const renderTelefonoInput = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Teléfono de contacto *</Text>
      <Text style={styles.hint}>Ingresa solo los 9 dígitos de tu móvil (comienza en 9).</Text>
      <View style={styles.phoneRow}>
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
    </View>
  );

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

      <View style={styles.inputGroup}>
        <Text style={styles.label}>RUT/CUIT/ID Fiscal *</Text>
        <Text style={styles.hint}>El guión antes del dígito verificador se coloca solo al escribir.</Text>
        <TextInput
          style={styles.input}
          value={formatRutForDisplay(rutCompact)}
          onChangeText={onRutChange}
          placeholder="Ej. 12.345.678-9"
          placeholderTextColor="#95a5a6"
          keyboardType="default"
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

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

      <View style={styles.inputGroup}>
        <Text style={styles.label}>DNI/RUT Personal *</Text>
        <Text style={styles.hint}>El guión antes del dígito verificador se coloca solo al escribir.</Text>
        <TextInput
          style={styles.input}
          value={formatRutForDisplay(dniCompact)}
          onChangeText={onDniChange}
          placeholder="Ej: 12.345.678-9"
          placeholderTextColor="#95a5a6"
          keyboardType="default"
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

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
            title={`Información de tu ${tipo === 'taller' ? 'taller' : 'servicio'}`}
            subtitle="Completa la información básica para continuar"
            currentStep={2}
            totalSteps={5}
            canGoBack={true}
            backPath={getBackPath()}
            icon={tipo === 'taller' ? 'business-outline' : 'car-sport-outline'}
          />

          <View style={styles.form}>
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle" size={20} color="#4E4FEB" />
              <Text style={styles.infoText}>
                Los campos marcados con * son obligatorios. Validamos RUT y teléfono para evitar cuentas duplicadas.
              </Text>
            </View>
            {tipo === 'taller' ? renderTallerForm() : renderMecanicoForm()}
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.fixedButtonContainer}>
          <TouchableOpacity
            style={[styles.continuarButton, (!isFormValid() || verificando) && styles.buttonDisabled]}
            onPress={handleContinuar}
            disabled={!isFormValid() || verificando}
            activeOpacity={0.8}
          >
            {verificando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continuarButtonText}>
                {isFormValid() ? 'Continuar' : 'Completa los campos requeridos'}
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
});

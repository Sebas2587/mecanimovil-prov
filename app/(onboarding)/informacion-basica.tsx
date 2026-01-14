import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import OnboardingHeader from '@/components/OnboardingHeader';

export default function InformacionBasicaScreen() {
  const { tipo } = useLocalSearchParams();
  const router = useRouter();
  const { usuario } = useAuth();
  
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    direccion: '',
    descripcion: '',
    telefono: '',
    experiencia_anos: '',
    dni: '',
  });

  useEffect(() => {
    // Pre-llenar con datos del usuario si están disponibles
    try {
      if (usuario) {
        // Capturar nombre completo del registro (first_name puede contener nombre completo)
        const nombreCompleto = usuario?.first_name 
          ? `${usuario.first_name}${usuario?.last_name ? ` ${usuario.last_name}` : ''}`.trim()
          : '';
        
        setFormData(prev => ({
          ...prev,
          nombre: nombreCompleto || prev.nombre || '',
          telefono: usuario?.telefono || prev.telefono || '',
        }));
      }
    } catch (error) {
      console.error('Error pre-llenando datos del usuario:', error);
      // Continuar sin pre-llenar si hay un error
    }
  }, [usuario]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isFormValid = () => {
    if (!formData.nombre.trim()) return false;
    if (!formData.descripcion.trim()) return false; // Descripción es requerida

    if (tipo === 'taller') {
      if (!formData.rut.trim()) return false;
      if (!formData.direccion.trim()) return false;
    } else if (tipo === 'mecanico') {
      if (!formData.dni.trim()) return false;
      if (!formData.experiencia_anos.trim()) return false;
      const experiencia = parseInt(formData.experiencia_anos);
      if (isNaN(experiencia) || experiencia < 0) return false;
    }

    return true;
  };

  const validateForm = () => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return false;
    }

    if (tipo === 'taller') {
      if (!formData.rut.trim()) {
        Alert.alert('Error', 'El RUT/CUIT es requerido para la identificación fiscal del taller');
        return false;
      }
      if (!formData.direccion.trim()) {
        Alert.alert('Error', 'La dirección es requerida para ubicar tu taller');
        return false;
      }
    } else if (tipo === 'mecanico') {
      if (!formData.dni.trim()) {
        Alert.alert('Error', 'El DNI/RUT personal es requerido para tu identificación');
        return false;
      }
      if (!formData.experiencia_anos.trim()) {
        Alert.alert('Error', 'Los años de experiencia son requeridos para validar tu competencia');
        return false;
      }
      const experiencia = parseInt(formData.experiencia_anos);
      if (isNaN(experiencia) || experiencia < 0) {
        Alert.alert('Error', 'Ingrese un número válido de años de experiencia');
        return false;
      }
    }

    return true;
  };

  const getBackPath = () => {
    // Retroceder al paso 1 (tipo-cuenta)
    return `/(onboarding)/tipo-cuenta`;
  };

  const handleContinuar = () => {
    try {
      if (!validateForm()) return;
      
      // Validar que tipo esté definido
      const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
      if (!tipoStr || (tipoStr !== 'taller' && tipoStr !== 'mecanico')) {
        Alert.alert('Error', 'Tipo de proveedor no válido. Por favor, vuelve al inicio.');
        router.replace('/(onboarding)/tipo-cuenta');
        return;
      }
      
      // Validar y limpiar datos antes de enviar
      const paramsParaEnviar: any = {
        tipo: tipoStr,
      };
      
      // Agregar solo campos válidos
      Object.entries(formData).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.trim()) {
          paramsParaEnviar[key] = value.trim();
        }
      });
      
      // Navegar a la siguiente pantalla pasando los datos
      router.push({
        pathname: '/especialidades' as any,
        params: paramsParaEnviar
      });
    } catch (error: any) {
      console.error('Error en handleContinuar:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error al continuar. Por favor, intenta nuevamente.',
        [{ text: 'OK' }]
      );
    }
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

      <View style={styles.inputGroup}>
        <Text style={styles.label}>RUT/CUIT/ID Fiscal *</Text>
        <TextInput
          style={styles.input}
          value={formData.rut}
          onChangeText={(value) => handleInputChange('rut', value)}
          placeholder="Ej. 12.345.678-9"
          placeholderTextColor="#95a5a6"
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

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Teléfono de Contacto</Text>
        <TextInput
          style={styles.input}
          value={formData.telefono}
          onChangeText={(value) => handleInputChange('telefono', value)}
          placeholder="Ej. +56 9 1234 5678"
          placeholderTextColor="#95a5a6"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Descripción del Servicio</Text>
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
        <TextInput
          style={styles.input}
          value={formData.dni}
          onChangeText={(value) => handleInputChange('dni', value)}
          placeholder="Ej: 12.345.678-9"
          placeholderTextColor="#95a5a6"
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

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Teléfono de Contacto</Text>
        <TextInput
          style={styles.input}
          value={formData.telefono}
          onChangeText={(value) => handleInputChange('telefono', value)}
          placeholder="Ej: +56 9 1234 5678"
          placeholderTextColor="#95a5a6"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Descripción de tu Experiencia</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.descripcion}
          onChangeText={(value) => handleInputChange('descripcion', value)}
          placeholder="Describe tu experiencia, especialidades, tipos de vehículos que atiendes..."
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
        >
          <OnboardingHeader
            title={`Información de tu ${tipo === 'taller' ? 'taller' : 'servicio'}`}
            subtitle="Completa la información básica para continuar"
            currentStep={2}
            totalSteps={6}
            canGoBack={true}
            backPath={getBackPath()}
            icon={tipo === 'taller' ? 'business-outline' : 'car-sport-outline'}
          />

          <View style={styles.form}>
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle" size={20} color="#4E4FEB" />
              <Text style={styles.infoText}>
                Los campos marcados con * son obligatorios para la validación y activación de tu cuenta.
              </Text>
            </View>
            {tipo === 'taller' ? renderTallerForm() : renderMecanicoForm()}
          </View>
        </ScrollView>

        {/* Botón fijo en la parte inferior */}
        <SafeAreaView edges={['bottom']} style={styles.fixedButtonContainer}>
          <TouchableOpacity
            style={[
              styles.continuarButton,
              !isFormValid() && styles.buttonDisabled
            ]}
            onPress={handleContinuar}
            disabled={!isFormValid()}
            activeOpacity={0.8}
          >
            <Text style={styles.continuarButtonText}>
              {isFormValid() ? 'Continuar' : 'Completa los campos requeridos'}
            </Text>
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
  input: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
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
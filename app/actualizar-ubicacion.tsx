import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack, router } from 'expo-router';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';

const COLORS = {
  primary: '#FF6B35',
  secondary: '#004E89',
  background: '#F8F9FA',
  white: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

export default function ActualizarUbicacionScreen() {
  const { estadoProveedor } = useAuth();
  const [direccion, setDireccion] = useState<string>('');
  const [coordenadas, setCoordenadas] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [loading, setLoading] = useState(false);
  const [obteniendoGPS, setObteniendoGPS] = useState(false);
  const [ubicacionActual, setUbicacionActual] = useState<{ direccion: string; lat: number; lng: number } | null>(null);

  // Verificar que solo los mecánicos a domicilio puedan acceder
  useEffect(() => {
    if (estadoProveedor?.tipo_proveedor === 'taller') {
      Alert.alert(
        'Acceso Restringido',
        'Esta funcionalidad solo está disponible para mecánicos a domicilio. Los talleres tienen una ubicación fija.',
        [
          {
            text: 'Entendido',
            onPress: () => router.back()
          }
        ]
      );
    }
  }, [estadoProveedor]);

  useEffect(() => {
    cargarUbicacionActual();
  }, []);

  const cargarUbicacionActual = async () => {
    try {
      // Aquí podrías cargar la ubicación actual del mecánico desde tu API
      console.log('Cargando ubicación actual del mecánico...');
    } catch (error) {
      console.error('Error cargando ubicación actual:', error);
    }
  };

  const obtenerUbicacionGPS = async () => {
    try {
      setObteniendoGPS(true);

      // Solicitar permisos de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permisos requeridos',
          'Se necesitan permisos de ubicación para obtener tu posición actual.'
        );
        return;
      }

      // Obtener ubicación actual
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setCoordenadas({ lat: latitude, lng: longitude });

      // Geocodificación inversa para obtener dirección
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (address) {
          const direccionCompleta = [
            address.streetNumber,
            address.street,
            address.city,
            address.region,
            address.country
          ].filter(Boolean).join(', ');

          setDireccion(direccionCompleta || `${latitude}, ${longitude}`);
        }
      } catch (geocodeError) {
        console.warn('Error en geocodificación inversa:', geocodeError);
        setDireccion(`${latitude}, ${longitude}`);
      }

      Alert.alert(
        'Ubicación obtenida',
        `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      );

    } catch (error) {
      console.error('Error obteniendo ubicación GPS:', error);
      Alert.alert(
        'Error',
        'No se pudo obtener la ubicación GPS. Verifica que tengas el GPS activado.'
      );
    } finally {
      setObteniendoGPS(false);
    }
  };

  const actualizarUbicacion = async () => {
    if (!direccion.trim() && (!coordenadas.lat || !coordenadas.lng)) {
      Alert.alert(
        'Datos incompletos',
        'Ingresa una dirección o usa el GPS para obtener tu ubicación.'
      );
      return;
    }

    try {
      setLoading(true);

      const payload = {
        direccion: direccion.trim(),
        ...(coordenadas.lat && coordenadas.lng && {
          latitud: coordenadas.lat,
          longitud: coordenadas.lng,
        }),
      };

      console.log('Actualizando ubicación con payload:', payload);

      // Aquí harías la llamada a tu API
      // const response = await api.patch('/usuarios/mecanicos-domicilio/actualizar_ubicacion_domicilio/', payload);

      // Simulación de éxito por ahora
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        'Ubicación actualizada',
        'Tu ubicación de domicilio ha sido actualizada exitosamente.',
        [
          {
            text: 'OK',
            onPress: () => {
              setDireccion('');
              setCoordenadas({ lat: null, lng: null });
              cargarUbicacionActual();
            },
          },
        ]
      );

    } catch (error) {
      console.error('Error actualizando ubicación:', error);
      Alert.alert(
        'Error',
        'No se pudo actualizar la ubicación. Intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title="Actualizar Ubicación"
        showBack={true}
        onBackPress={() => router.back()}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.headerIcon}>
            <Ionicons name="location" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.subtitle}>
            Mantén actualizada tu ubicación para que los clientes puedan encontrarte fácilmente
          </Text>
        </View>

        {/* Ubicación actual */}
        {ubicacionActual && (
          <View style={styles.currentLocationCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="home" size={20} color={COLORS.secondary} />
              <Text style={styles.cardTitle}>Ubicación Actual</Text>
            </View>
            <Text style={styles.currentAddress}>{ubicacionActual.direccion}</Text>
            <Text style={styles.currentCoords}>
              {ubicacionActual.lat}, {ubicacionActual.lng}
            </Text>
          </View>
        )}

        {/* Formulario */}
        <View style={styles.form}>
          {/* Dirección manual */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dirección de domicilio</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Los Leones 1200, Providencia, Santiago"
              value={direccion}
              onChangeText={setDireccion}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.inputHelp}>
              Ingresa tu dirección completa para mejor precisión
            </Text>
          </View>

          {/* GPS Button */}
          <TouchableOpacity
            style={[styles.gpsButton, obteniendoGPS && styles.gpsButtonLoading]}
            onPress={obtenerUbicacionGPS}
            disabled={obteniendoGPS}
          >
            {obteniendoGPS ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="navigate" size={20} color={COLORS.white} />
            )}
            <Text style={styles.gpsButtonText}>
              {obteniendoGPS ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual (GPS)'}
            </Text>
          </TouchableOpacity>

          {/* Coordenadas (si existen) */}
          {coordenadas.lat && coordenadas.lng && (
            <View style={styles.coordsCard}>
              <View style={styles.coordsHeader}>
                <Ionicons name="pin" size={16} color={COLORS.success} />
                <Text style={styles.coordsTitle}>Coordenadas GPS</Text>
              </View>
              <Text style={styles.coordsText}>
                Latitud: {coordenadas.lat.toFixed(6)}
              </Text>
              <Text style={styles.coordsText}>
                Longitud: {coordenadas.lng.toFixed(6)}
              </Text>
            </View>
          )}

          {/* Información importante */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color={COLORS.warning} />
              <Text style={styles.infoTitle}>Información importante</Text>
            </View>
            <Text style={styles.infoText}>
              • Tu ubicación de domicilio determina desde dónde ofreces servicios a domicilio
            </Text>
            <Text style={styles.infoText}>
              • Los clientes verán la distancia desde tu domicilio hasta su ubicación
            </Text>
            <Text style={styles.infoText}>
              • Solo aparecerás para clientes dentro de tu radio de cobertura (10 km)
            </Text>
          </View>

          {/* Botón actualizar */}
          <TouchableOpacity
            style={[styles.updateButton, loading && styles.updateButtonLoading]}
            onPress={actualizarUbicacion}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
            )}
            <Text style={styles.updateButtonText}>
              {loading ? 'Actualizando...' : 'Actualizar Ubicación'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  currentLocationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  currentAddress: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 4,
  },
  currentCoords: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 80,
  },
  inputHelp: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  gpsButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  gpsButtonLoading: {
    opacity: 0.7,
  },
  gpsButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  coordsCard: {
    backgroundColor: `${COLORS.success}10`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${COLORS.success}30`,
  },
  coordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coordsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
    marginLeft: 4,
  },
  coordsText: {
    fontSize: 13,
    color: COLORS.success,
    marginBottom: 2,
  },
  infoCard: {
    backgroundColor: `${COLORS.warning}10`,
    borderRadius: 8,
    padding: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: `${COLORS.warning}30`,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.warning,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.warning,
    marginBottom: 8,
    lineHeight: 20,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  updateButtonLoading: {
    opacity: 0.7,
  },
  updateButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 
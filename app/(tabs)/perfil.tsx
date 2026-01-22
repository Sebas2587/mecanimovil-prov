import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
  Linking,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { router, Stack } from 'expo-router';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';

export default function PerfilScreen() {
  const theme = useTheme();
  const {
    isLoading,
    estadoProveedor,
    usuario,
    logout,
    refrescarEstadoProveedor,
    obtenerNombreProveedor,
    obtenerDatosCompletosProveedor
  } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Obtener valores del sistema de diseño
  const safeColors = useMemo(() => theme?.colors || COLORS || {}, [theme]);
  const safeSpacing = useMemo(() => theme?.spacing || SPACING || {}, [theme]);
  const safeTypography = useMemo(() => theme?.typography || TYPOGRAPHY || {}, [theme]);
  const safeShadows = useMemo(() => theme?.shadows || SHADOWS || {}, [theme]);
  const safeBorders = useMemo(() => theme?.borders || BORDERS || {}, [theme]);

  // Colores del sistema de diseño
  const bgPaper = (safeColors?.background as any)?.paper || (safeColors?.base as any)?.white || '#FFFFFF';
  const bgDefault = (safeColors?.background as any)?.default || '#EEEEEE';
  const textPrimary = safeColors?.text?.primary || '#000000';
  const textSecondary = safeColors?.text?.secondary || '#666666';
  const textTertiary = safeColors?.text?.tertiary || '#999999';
  const borderLight = (safeColors?.border as any)?.light || '#EEEEEE';
  const borderMain = (safeColors?.border as any)?.main || '#D0D0D0';
  const primary500 = (safeColors?.primary as any)?.['500'] || '#4E4FEB';
  const success500 = (safeColors?.success as any)?.main || (safeColors?.success as any)?.['500'] || '#3DB6B1';
  const error500 = (safeColors?.error as any)?.main || (safeColors?.error as any)?.['500'] || '#FF5555';
  const warning500 = (safeColors?.warning as any)?.main || (safeColors?.warning as any)?.['500'] || '#FFB84D';
  const primaryLight = (safeColors?.primary as any)?.['50'] || (safeColors?.primary as any)?.light || '#E6F2FF';
  const neutralGray100 = ((safeColors?.neutral as any)?.gray as any)?.['100'] || '#F5F5F5';
  const textOnPrimary = safeColors?.text?.onPrimary || '#FFFFFF';

  // Obtener foto del proveedor (prioridad: datos_proveedor.foto_perfil > usuario.foto_perfil)
  const fotoProveedor = useMemo(() => {
    // Intentar obtener desde datos_proveedor primero
    const fotoDesdeDatos = (estadoProveedor?.datos_proveedor as any)?.foto_perfil;
    if (fotoDesdeDatos) return fotoDesdeDatos;

    // Si no está en datos_proveedor, intentar desde usuario
    if (usuario?.foto_perfil) return usuario.foto_perfil;

    return null;
  }, [estadoProveedor?.datos_proveedor, usuario?.foto_perfil]);

  // Determinar si es taller o mecánico a domicilio
  const esTaller = estadoProveedor?.tipo_proveedor === 'taller';
  const esMecanicoDomicilio = estadoProveedor?.tipo_proveedor === 'mecanico';

  const handleContactarSoporte = () => {
    const phoneNumber = '+56995945258';
    const message = 'Hola, soy proveedor de la app MecaniMóvil y tengo un problema con la aplicación, pagos o configuración.';
    const url = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert('Error', 'No se pudo abrir WhatsApp. Por favor verifica que esté instalado.');
        } else {
          return Linking.openURL(url);
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };

  const handleActualizarEstado = async () => {
    try {
      await refrescarEstadoProveedor();
      Alert.alert('Estado Actualizado', 'Se ha actualizado el estado de tu perfil.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado. Intenta nuevamente.');
    }
  };

  const handleCerrarSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              // La navegación se manejará automáticamente por el useEffect en index.tsx
            } catch (error) {
              console.error('Error en logout:', error);
              Alert.alert('Error', 'Hubo un problema al cerrar sesión. Intenta nuevamente.');
            } finally {
              setIsLoggingOut(false);
            }
          }
        },
      ]
    );
  };

  // Funciones de navegación para proveedores verificados
  const handleConfigurarHorarios = () => {
    router.push('/configuracion-horarios');
  };

  const handleConfigurarServicios = () => {
    router.push('/especialidades-marcas');
  };

  const handleMisServicios = () => {
    router.push('/mis-servicios');
  };

  const handleGestionarPerfil = () => {
    router.push('/configuracion-perfil');
  };

  // Funciones específicas para mecánicos a domicilio
  const handleZonasServicio = () => {
    router.push('/zonas-servicio');
  };

  // Funciones específicas para talleres
  const handleGestionarTaller = () => {
    router.push('/gestionar-taller');
  };

  const handleVerHistorial = () => {
    router.push('/(tabs)/ordenes');
  };

  const handleCreditos = () => {
    router.push('/creditos');
  };

  const handleMercadoPago = () => {
    router.push('/configuracion-mercadopago');
  };

  const getEstadoColor = () => {
    if (estadoProveedor?.verificado) return success500;
    switch (estadoProveedor?.estado_verificacion) {
      case 'pendiente':
        return warning500;
      case 'en_revision':
        return primary500;
      case 'rechazado':
        return error500;
      default:
        return textTertiary;
    }
  };

  const getEstadoTexto = () => {
    if (estadoProveedor?.verificado) return 'Verificado';
    switch (estadoProveedor?.estado_verificacion) {
      case 'pendiente':
        return 'Pendiente de Revisión';
      case 'en_revision':
        return 'En Revisión';
      case 'rechazado':
        return 'Rechazado';
      default:
        return 'Sin Estado';
    }
  };

  // Renderizar item de información personal (About Me style)
  const renderAboutMeItem = (icon: string, label: string, value: string, showArrow: boolean = false, onPress?: () => void) => {
    const ItemWrapper = onPress ? TouchableOpacity : View;
    return (
      <ItemWrapper style={[styles.aboutMeItem, { borderBottomColor: borderLight }]} onPress={onPress}>
        <View style={styles.aboutMeItemLeft}>
          <View style={[styles.aboutMeIconContainer, { backgroundColor: primaryLight }]}>
            <MaterialIcons name={icon as any} size={20} color={primary500} />
          </View>
          <View style={styles.aboutMeItemText}>
            <Text style={[styles.aboutMeLabel, { color: textTertiary }]}>{label}</Text>
            <Text style={[styles.aboutMeValue, { color: textPrimary }]}>{value}</Text>
          </View>
        </View>
        {showArrow && <MaterialIcons name="chevron-right" size={20} color={textTertiary} />}
      </ItemWrapper>
    );
  };

  // Renderizar item de configuración (Settings style)
  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    showToggle?: boolean,
    toggleValue?: boolean,
    onToggleChange?: (value: boolean) => void,
    badge?: string
  ) => (
    <TouchableOpacity style={[styles.settingItem, { borderBottomColor: borderLight }]} onPress={onPress} disabled={showToggle}>
      <View style={styles.settingItemLeft}>
        <View style={[styles.settingIconContainer, { backgroundColor: primaryLight }]}>
          <MaterialIcons name={icon as any} size={20} color={primary500} />
        </View>
        <View style={styles.settingItemText}>
          <Text style={[styles.settingItemTitle, { color: textPrimary }]}>{title}</Text>
          <Text style={[styles.settingItemSubtitle, { color: textTertiary }]}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.settingItemRight}>
        {badge && (
          <View style={[styles.badge, { backgroundColor: error500 }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        {showToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggleChange}
            trackColor={{ false: borderLight, true: success500 }}
            thumbColor="#FFFFFF"
          />
        ) : (
          <MaterialIcons name="chevron-right" size={20} color={textTertiary} />
        )}
      </View>
    </TouchableOpacity>
  );

  // Crear estilos
  const styles = createStyles();

  if (isLoading) {
    return (
      <TabScreenWrapper style={[styles.container, { backgroundColor: bgPaper }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary500} />
          <Text style={[styles.loadingText, { color: textTertiary }]}>Cargando configuración...</Text>
        </View>
      </TabScreenWrapper>
    );
  }

  return (
    <TabScreenWrapper style={[styles.container, { backgroundColor: bgPaper }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header consistente del sistema de diseño */}
      <Header
        title="Configuración"
      />

      <ScrollView
        style={[styles.scrollView, { backgroundColor: bgPaper }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Sección de perfil con foto */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {fotoProveedor ? (
              <Image source={{ uri: fotoProveedor }} style={[styles.avatar, { borderColor: borderMain }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: neutralGray100, borderColor: borderMain }]}>
                <MaterialIcons name="person" size={48} color={textTertiary} />
              </View>
            )}
          </View>
          <Text style={[styles.profileName, { color: textPrimary }]}>
            {obtenerNombreProveedor() || 'Proveedor'}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getEstadoColor() }]} />
            <Text style={[styles.statusText, { color: textTertiary }]}>{getEstadoTexto()}</Text>
          </View>

          {/* Botón de Editar Perfil - Separado de Información Personal */}
          <TouchableOpacity
            style={[styles.editProfileButton, {
              backgroundColor: primary500,
              borderColor: primary500,
            }]}
            onPress={handleGestionarPerfil}
            activeOpacity={0.8}
          >
            <MaterialIcons name="edit" size={18} color={textOnPrimary} />
            <Text style={[styles.editProfileButtonText, { color: textOnPrimary }]}>
              Editar Perfil
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sección "Información Personal" (About Me) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Información Personal</Text>
          <View style={[styles.sectionContent, { backgroundColor: bgPaper, borderColor: borderLight }]}>
            {renderAboutMeItem(
              'person',
              'Nombre de Usuario',
              usuario?.username ? `@${usuario.username}` : 'Sin usuario'
            )}
            {renderAboutMeItem(
              'email',
              'Dirección de E-mail',
              usuario?.email || 'Sin email'
            )}
            {estadoProveedor?.datos_proveedor?.telefono && renderAboutMeItem(
              'phone',
              'Número de Teléfono',
              estadoProveedor.datos_proveedor.telefono
            )}
            {((estadoProveedor?.datos_proveedor as any)?.direccion_fisica?.direccion_completa || (estadoProveedor?.datos_proveedor as any)?.direccion) && renderAboutMeItem(
              'location-on',
              'Dirección',
              (estadoProveedor?.datos_proveedor as any)?.direccion_fisica?.direccion_completa || (estadoProveedor?.datos_proveedor as any)?.direccion || 'Sin dirección'
            )}
          </View>
        </View>

        {/* Sección "Configuración" (Settings) - Layout de 2 columnas tipo card */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Configuración</Text>
          <View style={styles.configGrid}>
            {/* Card de Créditos */}
            <TouchableOpacity
              style={[styles.configCard, { backgroundColor: bgPaper, borderColor: borderLight }]}
              onPress={handleCreditos}
              activeOpacity={0.7}
            >
              <View style={[styles.configCardIcon, { backgroundColor: 'transparent', padding: 0, overflow: 'hidden' }]}>
                <Image
                  source={require('../../assets/images/creditos_icon.jpg')}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                  resizeMode="cover"
                />
              </View>
              <Text style={[styles.configCardTitle, { color: textPrimary }]}>Créditos</Text>
              <Text style={[styles.configCardSubtitle, { color: textTertiary }]}>Gestionar saldo</Text>
            </TouchableOpacity>

            {/* Card de Horarios */}
            <TouchableOpacity
              style={[styles.configCard, { backgroundColor: bgPaper, borderColor: borderLight }]}
              onPress={handleConfigurarHorarios}
              activeOpacity={0.7}
            >
              <View style={[styles.configCardIcon, { backgroundColor: 'transparent', padding: 0, overflow: 'hidden' }]}>
                <Image
                  source={require('../../assets/images/horarios_icon.jpg')}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                  resizeMode="cover"
                />
              </View>
              <Text style={[styles.configCardTitle, { color: textPrimary }]}>Horarios</Text>
              <Text style={[styles.configCardSubtitle, { color: textTertiary }]}>Disponibilidad</Text>
            </TouchableOpacity>

            {/* Card de Especialidades */}
            <TouchableOpacity
              style={[styles.configCard, { backgroundColor: bgPaper, borderColor: borderLight }]}
              onPress={handleConfigurarServicios}
              activeOpacity={0.7}
            >
              <View style={[styles.configCardIcon, { backgroundColor: 'transparent', padding: 0, overflow: 'hidden' }]}>
                <Image
                  source={require('../../assets/images/especialidades_icon.jpg')}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                  resizeMode="cover"
                />
              </View>
              <Text style={[styles.configCardTitle, { color: textPrimary }]}>Especialidades</Text>
              <Text style={[styles.configCardSubtitle, { color: textTertiary }]}>Configurar</Text>
            </TouchableOpacity>

            {/* Card de Mis Servicios */}
            <TouchableOpacity
              style={[styles.configCard, { backgroundColor: bgPaper, borderColor: borderLight }]}
              onPress={handleMisServicios}
              activeOpacity={0.7}
            >
              <View style={[styles.configCardIcon, { backgroundColor: 'transparent', padding: 0, overflow: 'hidden' }]}>
                <Image
                  source={require('../../assets/images/mis_servicios_icon.jpg')}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                  resizeMode="cover"
                />
              </View>
              <Text style={[styles.configCardTitle, { color: textPrimary }]}>Mis Servicios</Text>
              <Text style={[styles.configCardSubtitle, { color: textTertiary }]}>Gestionar ofertas</Text>
            </TouchableOpacity>

            {/* Card de Mercado Pago */}
            <TouchableOpacity
              style={[styles.configCard, { backgroundColor: bgPaper, borderColor: borderLight }]}
              onPress={handleMercadoPago}
              activeOpacity={0.7}
            >
              <View style={[styles.configCardIcon, { backgroundColor: 'transparent', padding: 0, overflow: 'hidden' }]}>
                <Image
                  source={require('../../assets/images/mercadopago_icon.jpg')}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                  resizeMode="cover"
                />
              </View>
              <Text style={[styles.configCardTitle, { color: textPrimary }]}>Mercado Pago</Text>
              <Text style={[styles.configCardSubtitle, { color: textTertiary }]}>Recibir pagos</Text>
            </TouchableOpacity>

            {/* Funcionalidades específicas según el tipo de proveedor */}
            {esMecanicoDomicilio ? (
              <TouchableOpacity
                style={[styles.configCard, { backgroundColor: bgPaper, borderColor: borderLight }]}
                onPress={handleZonasServicio}
                activeOpacity={0.7}
              >
                <View style={[styles.configCardIcon, { backgroundColor: 'transparent', padding: 0, overflow: 'hidden' }]}>
                  <Image
                    source={require('../../assets/images/zonas_icon.jpg')}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    resizeMode="cover"
                  />
                </View>
                <Text style={[styles.configCardTitle, { color: textPrimary }]}>Zonas</Text>
                <Text style={[styles.configCardSubtitle, { color: textTertiary }]}>Cobertura</Text>
              </TouchableOpacity>
            ) : esTaller ? (
              <TouchableOpacity
                style={[styles.configCard, { backgroundColor: bgPaper, borderColor: borderLight }]}
                onPress={handleGestionarTaller}
                activeOpacity={0.7}
              >
                <View style={[styles.configCardIcon, { backgroundColor: primaryLight }]}>
                  <MaterialIcons name="business" size={24} color={primary500} />
                </View>
                <Text style={[styles.configCardTitle, { color: textPrimary }]}>Taller</Text>
                <Text style={[styles.configCardSubtitle, { color: textTertiary }]}>Gestionar información</Text>
              </TouchableOpacity>
            ) : null}

            {/* Card de Soporte */}
            <TouchableOpacity
              style={[styles.configCard, { backgroundColor: bgPaper, borderColor: borderLight }]}
              onPress={handleContactarSoporte}
              activeOpacity={0.7}
            >
              <View style={[styles.configCardIcon, { backgroundColor: 'transparent', padding: 0, overflow: 'hidden' }]}>
                <Image
                  source={require('../../assets/images/soporte_icon.jpg')}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                  resizeMode="cover"
                />
              </View>
              <Text style={[styles.configCardTitle, { color: textPrimary }]}>Soporte</Text>
              <Text style={[styles.configCardSubtitle, { color: textTertiary }]}>Ayuda</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botones inferiores */}
        <View style={[styles.bottomActions, { borderTopColor: borderLight }]}>
          <TouchableOpacity
            style={[styles.signOutButton, isLoggingOut && styles.signOutButtonDisabled]}
            onPress={handleCerrarSesion}
            disabled={isLoggingOut}
          >
            <MaterialIcons name="logout" size={20} color={error500} />
            <Text style={[styles.signOutText, { color: error500 }]}>
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
            </Text>
            {isLoggingOut && <ActivityIndicator size="small" color={error500} style={{ marginLeft: 8 }} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.privacyButton} onPress={handleContactarSoporte}>
            <Text style={[styles.privacyText, { color: textTertiary }]}>Privacidad y Política</Text>
          </TouchableOpacity>
        </View>

        {/* Espacio al final */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </TabScreenWrapper>
  );
}

// Crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const containerHorizontal = SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontSizeXl = TYPOGRAPHY?.fontSize?.xl || 20;
  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';
  const radiusMd = BORDERS?.radius?.md || 8;
  const radiusLg = BORDERS?.radius?.lg || 12;
  const radiusXl = BORDERS?.radius?.xl || 16;
  const radius2xl = BORDERS?.radius?.['2xl'] || 20;

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacingMd,
      fontSize: fontSizeBase,
    },
    helpButton: {
      width: 40,
      height: 40,
      borderRadius: radiusMd,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Profile section
    profileSection: {
      alignItems: 'center',
      paddingVertical: spacingLg + spacingMd,
      paddingHorizontal: containerHorizontal,
    },
    avatarContainer: {
      marginBottom: spacingMd,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 3,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
    },
    profileName: {
      fontSize: fontSizeXl + 4,
      fontWeight: fontWeightBold,
      marginBottom: spacingSm,
      textAlign: 'center',
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
    },
    // Botón de Editar Perfil - Usando tokens del sistema de diseño
    editProfileButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacingMd + spacingSm,
      paddingVertical: spacingMd - 2,
      paddingHorizontal: spacingLg + spacingSm,
      borderRadius: BORDERS?.radius?.button?.md || radiusLg,
      borderWidth: BORDERS?.width?.thin || 1,
      gap: spacingSm,
      minWidth: 150,
      // Usar sombra del sistema de diseño para botones
      ...(SHADOWS?.button || SHADOWS?.md || {
        shadowColor: '#00171F',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }),
    },
    editProfileButtonText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      letterSpacing: 0.3,
    },
    // Sections
    section: {
      marginBottom: spacingLg + spacingMd,
      paddingHorizontal: containerHorizontal,
    },
    sectionTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      marginBottom: spacingMd,
    },
    sectionContent: {
      borderRadius: radiusXl,
      borderWidth: 1,
      overflow: 'hidden',
    },
    // About Me items
    aboutMeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacingMd,
      paddingHorizontal: spacingMd,
      borderBottomWidth: 1,
    },
    aboutMeItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    aboutMeIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacingSm + 4,
    },
    aboutMeItemText: {
      flex: 1,
    },
    aboutMeLabel: {
      fontSize: fontSizeBase - 2,
      fontWeight: fontWeightMedium,
      marginBottom: spacingSm / 2,
    },
    aboutMeValue: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
    },
    // Setting items
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacingMd,
      paddingHorizontal: spacingMd,
      borderBottomWidth: 1,
    },
    settingItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacingSm + 4,
    },
    settingItemText: {
      flex: 1,
    },
    settingItemTitle: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
      marginBottom: spacingSm / 2,
    },
    settingItemSubtitle: {
      fontSize: fontSizeBase - 2,
      fontWeight: fontWeightMedium,
    },
    settingItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    badge: {
      paddingHorizontal: spacingSm,
      paddingVertical: spacingSm / 2,
      borderRadius: radiusLg,
      marginRight: spacingSm,
    },
    // Config Grid (2 columnas tipo card)
    configGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacingMd,
    },
    configCard: {
      width: '47%', // 2 columnas con gap
      borderRadius: radiusXl,
      borderWidth: 1,
      padding: spacingMd,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
      ...(SHADOWS?.sm || {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }),
    },
    configCardIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacingSm,
    },
    configCardTitle: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      marginBottom: spacingSm / 2,
      textAlign: 'center',
    },
    configCardSubtitle: {
      fontSize: fontSizeBase - 2,
      fontWeight: fontWeightMedium,
      textAlign: 'center',
    },
    badgeText: {
      fontSize: 10,
      fontWeight: fontWeightSemibold,
      color: '#FFFFFF',
    },
    // Bottom actions
    bottomActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: containerHorizontal,
      paddingVertical: spacingLg,
      borderTopWidth: 1,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    signOutButtonDisabled: {
      opacity: 0.6,
    },
    signOutText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
    },
    privacyButton: {
      paddingVertical: spacingSm,
    },
    privacyText: {
      fontSize: fontSizeBase - 2,
      fontWeight: fontWeightMedium,
    },
    bottomSpacing: {
      height: spacingLg,
    },
  });
};

// Los estilos se crean dentro del componente para acceder a safeShadows
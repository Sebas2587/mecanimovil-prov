import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { MensajeChat } from '@/services/solicitudesService';
import ServerConfig from '@/services/serverConfig';

interface ChatBubbleProps {
  mensaje: MensajeChat;
  esPropio: boolean;
  onImagePress?: (imageUrl: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ mensaje, esPropio, onImagePress }) => {
  const [loadingImage, setLoadingImage] = useState(false);
  const theme = useTheme();

  // Obtener valores del sistema de diseño
  const colors = theme?.colors || COLORS || {};
  const textPrimary = colors?.text?.primary || '#000000';
  const textSecondary = colors?.text?.secondary || '#666666';
  const textTertiary = colors?.text?.tertiary || '#999999';
  const borderLight = colors?.border?.light || '#EEEEEE';
  const white = colors?.base?.white || '#FFFFFF';

  // Colores para los bubbles
  const primaryColor = colors?.primary?.['500'] || '#4E4FEB'; // Color primario para mensajes del proveedor
  const secondaryColor = colors?.secondary?.['500'] || '#068FFF';
  const bubbleOtroBg = borderLight;
  const bubblePropioBg = primaryColor; // Usar color primario para mensajes del proveedor

  // Color para nombre del remitente
  const nombreColor = primaryColor; // Usar color primario para consistencia

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[
      styles.container,
      esPropio ? styles.containerPropio : styles.containerOtro
    ]}>
      <View style={[
        styles.bubble,
        esPropio
          ? { backgroundColor: bubblePropioBg }
          : { backgroundColor: bubbleOtroBg }
      ]}>
        {!esPropio && (mensaje.nombre_remitente || mensaje.enviado_por_nombre) && (
          <Text style={[
            styles.nombreRemitente,
            { color: nombreColor }
          ]}>
            {mensaje.nombre_remitente || mensaje.enviado_por_nombre}
          </Text>
        )}

        {/* Renderizar imagen adjunta si existe */}
        {mensaje.archivo_adjunto && (
          <View style={styles.imagenContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                const url = mensaje.archivo_adjunto;
                if (!url) return;

                // Construct full URL for the modal
                let fullUrl = url;
                if (!url.startsWith('http') && !url.startsWith('file://')) {
                  const baseUrl = ServerConfig.getInstance().getMediaURLSync();
                  if (baseUrl) {
                    fullUrl = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
                  }
                }

                onImagePress?.(fullUrl);
              }}
              disabled={!onImagePress}
            >
              <Image
                source={{
                  uri: (() => {
                    const url = mensaje.archivo_adjunto;
                    if (!url) return '';
                    if (url.startsWith('http') || url.startsWith('file://')) return url;

                    const baseUrl = ServerConfig.getInstance().getMediaURLSync();
                    if (baseUrl) {
                      return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
                    }
                    return url;
                  })()
                }}
                style={styles.imagenAdjunta}
                resizeMode="cover"
                onLoadStart={() => setLoadingImage(true)}
                onLoadEnd={() => setLoadingImage(false)}
              />
              {loadingImage && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={esPropio ? white : secondaryColor} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Renderizar texto solo si hay mensaje */}
        {mensaje.mensaje ? (
          <Text style={[
            styles.mensajeTexto,
            esPropio
              ? { color: white }
              : { color: textPrimary }
          ]}>
            {mensaje.mensaje}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={[
            styles.timestamp,
            esPropio
              ? { color: white + 'B3' } // 70% opacity
              : { color: textTertiary }
          ]}>
            {formatTime(mensaje.fecha_envio)}
          </Text>
          {esPropio && mensaje.leido && (
            <MaterialIcons name="done-all" size={14} color={white + 'B3'} />
          )}
        </View>
      </View>
    </View>
  );
};

// Crear estilos dinámicos usando los tokens del sistema de diseño
const createStyles = () => {
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;

  const fontSizeXs = TYPOGRAPHY?.fontSize?.xs || 10;
  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeBasePlus = fontSizeBase + 1; // 15

  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';

  const radiusLg = BORDERS?.radius?.lg || 12;
  const radiusXl = BORDERS?.radius?.xl || 16;

  return StyleSheet.create({
    container: {
      marginVertical: spacingXs,
      paddingHorizontal: spacingMd,
      maxWidth: '85%',
    },
    containerPropio: {
      alignItems: 'flex-end',
      alignSelf: 'flex-end',
    },
    containerOtro: {
      alignItems: 'flex-start',
      alignSelf: 'flex-start',
    },
    bubble: {
      paddingVertical: 10,
      paddingHorizontal: spacingSm + 6, // 14
      borderRadius: radiusXl,
      maxWidth: '100%',
    },
    nombreRemitente: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
      marginBottom: spacingXs,
    },
    mensajeTexto: {
      fontSize: fontSizeBasePlus,
      lineHeight: 20,
    },
    imagenContainer: {
      borderRadius: radiusLg,
      overflow: 'hidden',
      marginBottom: spacingXs,
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
    imagenAdjunta: {
      width: 200,
      height: 150,
      backgroundColor: '#f0f0f0',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.1)',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: spacingXs,
      gap: spacingXs,
    },
    timestamp: {
      fontSize: fontSizeXs + 1, // 11
    },
  });
};

const styles = createStyles();

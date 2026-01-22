import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { MensajeChat } from '@/services/solicitudesService';

interface ChatBubbleProps {
  mensaje: MensajeChat;
  esPropio: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ mensaje, esPropio }) => {
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
        
        <Text style={[
          styles.mensajeTexto,
          esPropio 
            ? { color: white }
            : { color: textPrimary }
        ]}>
          {mensaje.mensaje}
        </Text>
        
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


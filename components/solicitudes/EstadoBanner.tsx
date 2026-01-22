import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

export type BannerType = 'success' | 'warning' | 'info' | 'error';

interface EstadoBannerProps {
  type: BannerType;
  title: string;
  message: string;
  icon?: string;
  action?: {
    text: string;
    onPress: () => void;
  };
}

export const EstadoBanner: React.FC<EstadoBannerProps> = ({
  type,
  title,
  message,
  icon,
  action,
}) => {
  const theme = useTheme();
  
  // Obtener valores del sistema de diseño
  const colors = theme?.colors || COLORS || {};
  const textPrimary = colors?.text?.primary || '#000000';
  const textSecondary = colors?.text?.secondary || '#666666';
  
  // Colores del sistema de diseño
  const successColor = (colors?.success as any)?.['500'] || colors?.success?.main || '#3DB6B1';
  const successLight = (colors?.success as any)?.['50'] || successColor + '15';
  
  const warningColor = (colors?.warning as any)?.['500'] || colors?.warning?.main || '#FFB84D';
  const warningLight = (colors?.warning as any)?.['50'] || warningColor + '15';
  
  const errorColor = (colors?.error as any)?.['500'] || colors?.error?.main || '#FF5555';
  const errorLight = (colors?.error as any)?.['50'] || errorColor + '15';
  
  const infoColor = colors?.secondary?.['500'] || colors?.info?.['500'] || '#068FFF';
  const infoLight = colors?.secondary?.['50'] || colors?.info?.['50'] || infoColor + '15';

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: successLight,
          iconColor: successColor,
          textColor: successColor,
          defaultIcon: 'check-circle',
        };
      case 'warning':
        return {
          backgroundColor: warningLight,
          iconColor: warningColor,
          textColor: warningColor,
          defaultIcon: 'warning',
        };
      case 'error':
        return {
          backgroundColor: errorLight,
          iconColor: errorColor,
          textColor: errorColor,
          defaultIcon: 'error',
        };
      case 'info':
      default:
        return {
          backgroundColor: infoLight,
          iconColor: infoColor,
          textColor: infoColor,
          defaultIcon: 'info',
        };
    }
  };

  const config = getTypeConfig();
  const displayIcon = icon || config.defaultIcon;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
        },
      ]}
    >
      <MaterialIcons 
        name={displayIcon as any} 
        size={24} 
        color={config.iconColor} 
      />
      <View style={styles.content}>
        <Text style={[styles.title, { color: config.textColor }]}>
          {title}
        </Text>
        <Text style={[styles.message, { color: textSecondary }]}>
          {message}
        </Text>
        {action && (
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: config.textColor }]}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: config.textColor }]}>
              {action.text}
            </Text>
            <MaterialIcons name="arrow-forward" size={16} color={config.textColor} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Crear estilos dinámicos usando los tokens del sistema de diseño
const createStyles = () => {
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  
  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  
  const radiusMd = BORDERS?.radius?.md || 8;
  const radiusLg = BORDERS?.radius?.lg || 12;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      padding: spacingMd,
      borderRadius: radiusLg,
      gap: spacingSm + spacingXs,
      marginBottom: spacingMd,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      marginBottom: spacingXs,
    },
    message: {
      fontSize: fontSizeSm,
      lineHeight: 18,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingVertical: spacingSm,
      paddingHorizontal: spacingSm + spacingXs,
      borderRadius: radiusMd,
      borderWidth: 1,
      marginTop: spacingSm + spacingXs,
      gap: spacingXs,
    },
    actionText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
    },
  });
};

const styles = createStyles();


/**
 * Header Component - MecaniMóvil Proveedores
 * Componente de header consistente usando el sistema de diseño
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';

interface HeaderProps {
  title: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  showBack?: boolean;
  onBackPress?: () => void;
  backgroundColor?: string;
  titleColor?: string;
  badge?: number | string;
  style?: any;
}

export default function Header({
  title,
  leftComponent,
  rightComponent,
  showBack = false,
  onBackPress,
  backgroundColor,
  titleColor,
  badge,
  style,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // Valores seguros del tema con fallbacks
  const safeColors = theme?.colors || COLORS || {};
  const safeSpacing = theme?.spacing || SPACING || {};
  const safeTypography = theme?.typography || TYPOGRAPHY || {};
  const safeShadows = theme?.shadows || SHADOWS || {};
  const safeBorders = theme?.borders || BORDERS || {};

  // Colores
  const bgColor = backgroundColor || safeColors?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const textColor = titleColor || safeColors?.text?.primary || COLORS?.neutral?.inkBlack || '#00171F';
  const borderColor = safeColors?.border?.light || (safeColors?.neutral?.gray as any)?.[200] || '#D7DFE3';
  const primaryColor = (safeColors?.primary as any)?.['500'] || (safeColors?.accent as any)?.['500'] || '#003459';
  const errorColor = (safeColors?.error as any)?.['500'] || '#EF4444';

  // Espaciado - Usar el mismo padding que otras pantallas (18px) para consistencia
  const containerHorizontal = safeSpacing?.container?.horizontal || SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
  const shadowSm = safeShadows?.sm || SHADOWS?.sm || {
    shadowColor: '#00171F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  };

  // Tipografía
  const titleSize = safeTypography?.fontSize?.xl || TYPOGRAPHY?.fontSize?.xl || 20;
  const titleWeight = safeTypography?.fontWeight?.bold || TYPOGRAPHY?.fontWeight?.bold || '700';

  // Bordes
  const borderWidth = safeBorders?.width?.thin || BORDERS?.width?.thin || 1;
  const badgeRadius = safeBorders?.radius?.badge?.full || safeBorders?.radius?.full || 9999;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 8), // Reducido de 10 a 8 para padding más compacto
          backgroundColor: bgColor,
          borderBottomColor: borderColor,
          borderBottomWidth: borderWidth,
          ...shadowSm,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.content,
          { paddingHorizontal: containerHorizontal },
        ]}
      >
        {/* Componente izquierdo */}
        <View style={styles.leftContainer}>
          {leftComponent ||
            (showBack && (
              <TouchableOpacity
                onPress={onBackPress}
                style={styles.iconButton}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color={primaryColor} />
              </TouchableOpacity>
            ))}
        </View>

        {/* Título centrado */}
        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.title,
              {
                color: textColor,
                fontSize: titleSize,
                fontWeight: titleWeight,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Componente derecho */}
        <View style={styles.rightContainer}>
          {rightComponent}
          {badge !== undefined && badge !== null && badge !== 0 && (
            <View style={[styles.badgeContainer, { backgroundColor: errorColor }]}>
              <Text style={styles.badgeText}>
                {typeof badge === 'number' && badge > 99 ? '99+' : String(badge)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Estilos aplicados dinámicamente
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING?.sm || 8,
  },
  title: {
    textAlign: 'center',
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS?.base?.white || '#FFFFFF',
    zIndex: 10,
  },
  badgeText: {
    color: COLORS?.base?.white || '#FFFFFF',
    fontSize: TYPOGRAPHY?.fontSize?.xs || 10,
    fontWeight: TYPOGRAPHY?.fontWeight?.bold || '700',
  },
});


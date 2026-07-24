import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { User } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { PrimaryGradientFill } from '@/app/design-system/components/PrimaryGradientFill';
import { BORDERS, COLORS } from '@/app/design-system/tokens';

const SIZE = 28;

type MenuTabIconProps = {
  focused: boolean;
};

/**
 * Icono de la pestaña Menú — avatar del taller (mismo patrón que Cuenta en usuarios).
 */
function MenuTabIcon({ focused }: MenuTabIconProps) {
  const { usuario, estadoProveedor } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);

  const avatarUrl = useMemo(() => {
    const fromTaller = (estadoProveedor?.datos_proveedor as { foto_perfil?: string } | undefined)
      ?.foto_perfil;
    if (fromTaller) return fromTaller;
    if (usuario?.foto_perfil) return usuario.foto_perfil;
    return null;
  }, [estadoProveedor?.datos_proveedor, usuario?.foto_perfil]);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const innerSize = SIZE - (focused ? 4 : 2);
  const showImage = !!avatarUrl && !imageFailed;
  const iconColor = focused ? COLORS.text.onPrimary : COLORS.icon.default;

  const avatarInner = showImage ? (
    <Image
      source={{ uri: avatarUrl }}
      style={{
        width: innerSize,
        height: innerSize,
        borderRadius: innerSize / 2,
      }}
      contentFit="cover"
      cachePolicy="memory-disk"
      onError={() => setImageFailed(true)}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        {
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: focused ? COLORS.background.paper : COLORS.background.secondary,
        },
      ]}
    >
      <User size={16} color={iconColor} strokeWidth={focused ? 2.25 : 2} />
    </View>
  );

  if (focused) {
    return (
      <PrimaryGradientFill
        style={[styles.ring, { width: SIZE, height: SIZE, borderRadius: SIZE / 2 }]}
      >
        {avatarInner}
      </PrimaryGradientFill>
    );
  }

  return (
    <View
      style={[
        styles.ring,
        {
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderColor: COLORS.border.light,
          borderWidth: BORDERS.width.thin,
        },
      ]}
    >
      {avatarInner}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 2,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(MenuTabIcon);

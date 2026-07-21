import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '@/app/design-system/tokens';

type Props = {
  textStyle?: object;
  linkStyle?: object;
  variant?: 'footer' | 'register';
};

export default function LegalFooterLinks({
  textStyle,
  linkStyle,
  variant = 'footer',
}: Props) {
  const goTerms = () => router.push('/terminos');
  const goPrivacy = () => router.push('/politica-privacidad');

  if (variant === 'register') {
    return (
      <Text style={textStyle}>
        Acepto los{' '}
        <Text style={linkStyle} onPress={goTerms}>
          términos de uso
        </Text>{' '}
        y la{' '}
        <Text style={linkStyle} onPress={goPrivacy}>
          política de privacidad
        </Text>
        .
      </Text>
    );
  }

  return (
    <Text style={[styles.footer, textStyle]}>
      Al continuar, aceptas los{' '}
      <Text style={[styles.link, linkStyle]} onPress={goTerms}>
        Términos de uso
      </Text>{' '}
      y la{' '}
      <Text style={[styles.link, linkStyle]} onPress={goPrivacy}>
        Política de privacidad
      </Text>{' '}
      de MecaniMóvil Proveedores (Ley 21.719).
    </Text>
  );
}

const styles = StyleSheet.create({
  footer: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.institutional.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: COLORS.institutional.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    textDecorationLine: 'underline',
  },
});

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { institutionalTextStyle } from '@/app/design-system/styles/institutionalTypography';
import { COLORS } from '@/app/design-system/tokens';

type Props = {
  textStyle?: object;
  linkStyle?: object;
  variant?: 'footer' | 'register';
};

const I = COLORS.institutional;

export default function LegalFooterLinks({
  textStyle,
  linkStyle,
  variant = 'footer',
}: Props) {
  const goTerms = () => router.push('/terminos');
  const goPrivacy = () => router.push('/politica-privacidad');

  const linkBase = institutionalTextStyle('navLink', I.primary);

  if (variant === 'register') {
    return (
      <Text style={textStyle}>
        Acepto los{' '}
        <Text style={[linkBase, linkStyle]} onPress={goTerms}>
          términos de uso
        </Text>{' '}
        y la{' '}
        <Text style={[linkBase, linkStyle]} onPress={goPrivacy}>
          política de privacidad
        </Text>
        .
      </Text>
    );
  }

  return (
    <Text style={[styles.footer, textStyle]}>
      Al continuar, aceptas los{' '}
      <Text style={[linkBase, linkStyle]} onPress={goTerms}>
        Términos de uso
      </Text>{' '}
      y la{' '}
      <Text style={[linkBase, linkStyle]} onPress={goPrivacy}>
        Política de privacidad
      </Text>{' '}
      de MecaniMóvil Proveedores (Ley 21.719).
    </Text>
  );
}

const styles = StyleSheet.create({
  footer: institutionalTextStyle('small', I.muted),
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  StatusBar,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { showAlert } from '@/utils/platformAlert';
import {
  HostPaperSection,
  InstitutionalButton,
  hostScreenStyles,
} from '@/app/design-system/components';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import LegalAcceptanceRow from '@/components/legal/LegalAcceptanceRow';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

const LOGO = require('@/assets/images/Group 27logo_negro_mecanimovil.png');
const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

const ERROR_MESSAGES: { [key: string]: string } = {
  'A user with that username already exists.':
    'Este nombre de usuario ya está en uso. Prueba con otro correo.',
  'user with this email already exists.':
    'Este correo electrónico ya está registrado. ¿Ya tienes una cuenta?',
  'This password is too common.': 'La contraseña es muy común. Por favor, usa una más segura.',
  'This password is entirely numeric.': 'La contraseña no puede ser solo números.',
  'The password is too similar to the username.': 'La contraseña es muy similar a tu usuario.',
  'This password is too short.': 'La contraseña es muy corta. Usa al menos 8 caracteres.',
  'Enter a valid email address.': 'Por favor, ingresa un correo electrónico válido.',
};

const getErrorMessage = (error: any): string => {
  if (
    error.message?.includes('Network') ||
    error.message?.includes('network') ||
    error.code === 'ERR_NETWORK'
  ) {
    return 'No hay conexión a internet. Por favor, verifica tu conexión e intenta nuevamente.';
  }

  if (error.response?.status === 500) {
    return 'Error en el servidor. Por favor, intenta más tarde.';
  }

  if (error.response?.status === 503) {
    return 'El servicio no está disponible temporalmente. Por favor, intenta más tarde.';
  }

  if (error.response?.data) {
    const data = error.response.data;

    if (data.username) {
      const msg = Array.isArray(data.username) ? data.username[0] : data.username;
      return ERROR_MESSAGES[msg] || `Usuario: ${msg}`;
    }

    if (data.email) {
      const msg = Array.isArray(data.email) ? data.email[0] : data.email;
      return ERROR_MESSAGES[msg] || `Correo: ${msg}`;
    }

    if (data.password) {
      const msg = Array.isArray(data.password) ? data.password[0] : data.password;
      return ERROR_MESSAGES[msg] || `Contraseña: ${msg}`;
    }

    if (data.non_field_errors) {
      const msg = Array.isArray(data.non_field_errors)
        ? data.non_field_errors[0]
        : data.non_field_errors;
      return ERROR_MESSAGES[msg] || msg;
    }

    if (data.error) {
      return ERROR_MESSAGES[data.error] || data.error;
    }

    if (data.detail) {
      return ERROR_MESSAGES[data.detail] || data.detail;
    }
  }

  if (error.message && ERROR_MESSAGES[error.message]) {
    return ERROR_MESSAGES[error.message];
  }

  return (
    error.message ||
    'Ha ocurrido un error al registrar tu cuenta. Por favor, intenta nuevamente.'
  );
};

export default function RegistroScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    firstName?: string;
    lastName?: string;
  }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { registro, limpiarStorage } = useAuth();

  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    contrasena: '',
    confirmarContrasena: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | undefined>();

  useEffect(() => {
    const prefillName = [params.firstName, params.lastName].filter(Boolean).join(' ').trim();
    if (prefillName || params.email) {
      setFormData((prev) => ({
        ...prev,
        nombre: prefillName || prev.nombre,
        correo: typeof params.email === 'string' ? params.email : prev.correo,
      }));
    }
  }, [params.email, params.firstName, params.lastName]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    if (errorMessage) setErrorMessage(null);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.nombre.trim()) return 'El nombre es requerido';
    if (!formData.correo.trim()) return 'El correo electrónico es requerido';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.correo)) {
      return 'Por favor ingresa un correo electrónico válido';
    }

    if (!formData.contrasena) return 'La contraseña es requerida';
    if (formData.contrasena.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (formData.contrasena !== formData.confirmarContrasena) {
      return 'Las contraseñas no coinciden';
    }
    if (!acceptTerms) {
      return 'Debes aceptar los términos y la política de privacidad';
    }
    return null;
  };

  const handleRegister = async () => {
    setErrorMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      if (validationError.includes('términos')) setTermsError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      await limpiarStorage();

      let username = formData.correo.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      if (username.length < 3) username = `${username}123`;
      if (username.length > 30) username = username.substring(0, 30);

      await registro({
        username,
        email: formData.correo.toLowerCase().trim(),
        password: formData.contrasena,
        first_name: formData.nombre.trim(),
        acepta_terminos: true,
      });

      router.replace('/(onboarding)/tipo-cuenta');
    } catch (error: any) {
      const friendlyMessage = getErrorMessage(error);
      setErrorMessage(friendlyMessage);

      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        showAlert(
          'Sin Conexión',
          'No se pudo conectar al servidor. Por favor, verifica tu conexión a internet.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(auth)/login');
  };

  const scrollContent = (
    <ScrollView
      style={hostScreenStyles.scroll}
      contentContainerStyle={[
        hostScreenStyles.scrollInner,
        styles.scrollInner,
        {
          paddingTop: insets.top + SPACING.sm,
          paddingBottom: insets.bottom + SPACING.md,
          flexGrow: 1,
          justifyContent: 'center',
        },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'web' ? undefined : 'on-drag'}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.logoWrap}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.heading}>
        <TouchableOpacity
          onPress={goToLogin}
          style={[styles.backRow, webCursor]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Volver a iniciar sesión"
        >
          <ChevronLeft size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.h1}>Crear cuenta</Text>
        <Text style={styles.subtitle}>
          Únete como proveedor.{' '}
          <Text style={styles.link} onPress={goToLogin}>
            Inicia sesión
          </Text>
        </Text>
      </View>

      <HostPaperSection style={styles.paper}>
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        <InstitutionalField
          compact
          label="Nombre completo"
          value={formData.nombre}
          onChangeText={(v) => handleInputChange('nombre', v)}
          placeholder="Tu nombre"
          autoCapitalize="words"
          editable={!isLoading}
        />

        <View style={styles.fieldGap} />

        <InstitutionalField
          compact
          label="Correo electrónico"
          value={formData.correo}
          onChangeText={(v) => handleInputChange('correo', v)}
          placeholder="ejemplo@correo.com"
          autoCapitalize="none"
          editable={!isLoading}
          textInputProps={{
            autoCorrect: false,
            keyboardType: 'email-address',
          }}
        />

        <View style={styles.fieldGap} />

        <InstitutionalField
          compact
          label="Contraseña"
          value={formData.contrasena}
          onChangeText={(v) => handleInputChange('contrasena', v)}
          placeholder="Mínimo 8 caracteres"
          autoCapitalize="none"
          editable={!isLoading}
          textInputProps={{
            secureTextEntry: true,
            autoCorrect: false,
            autoComplete: 'new-password',
            textContentType: 'newPassword',
          }}
        />

        <View style={styles.fieldGap} />

        <InstitutionalField
          compact
          label="Confirmar contraseña"
          value={formData.confirmarContrasena}
          onChangeText={(v) => handleInputChange('confirmarContrasena', v)}
          placeholder="Repite tu contraseña"
          autoCapitalize="none"
          editable={!isLoading}
          textInputProps={{
            secureTextEntry: true,
            autoCorrect: false,
            autoComplete: 'new-password',
            textContentType: 'newPassword',
          }}
        />

        <View style={styles.termsGap} />

        <LegalAcceptanceRow
          checked={acceptTerms}
          onToggle={() => {
            setAcceptTerms((v) => !v);
            if (termsError) setTermsError(undefined);
          }}
          error={termsError}
        />

        <View style={styles.ctaGap} />

        <InstitutionalButton
          label={isLoading ? 'Creando cuenta…' : 'Crear cuenta'}
          variant="primary"
          size="compact"
          loading={isLoading}
          disabled={isLoading || !acceptTerms}
          onPress={handleRegister}
        />
      </HostPaperSection>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {Platform.OS === 'web' ? (
          scrollContent
        ) : (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            {scrollContent}
          </TouchableWithoutFeedback>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  flex: {
    flex: 1,
  },
  scrollInner: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: SPACING.fixed.sm,
  },
  logo: {
    width: 132,
    height: 34,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: SPACING.fixed.xxs,
    gap: 2,
  },
  backText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.ink,
  },
  heading: {
    marginBottom: SPACING.fixed.md,
    gap: 2,
  },
  h1: {
    fontSize: TS.h3.fontSize,
    lineHeight: Math.round(TS.h3.fontSize * 1.15),
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    letterSpacing: TS.h3.letterSpacing ?? 0,
  },
  subtitle: {
    fontSize: TS.caption.fontSize,
    lineHeight: Math.round(TS.caption.fontSize * 1.35),
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  link: {
    color: I.primary,
    fontFamily: FF.sansSemiBold,
  },
  paper: {
    marginBottom: 0,
    gap: 0,
  },
  fieldGap: {
    height: SPACING.fixed.sm,
  },
  termsGap: {
    height: SPACING.fixed.md,
  },
  ctaGap: {
    height: SPACING.fixed.sm,
  },
  errorBanner: {
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.semanticDown,
    padding: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  errorBannerText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.semanticDown,
    lineHeight: 18,
  },
});

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : null;

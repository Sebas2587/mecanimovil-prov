import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { showAlert } from '@/utils/platformAlert';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import {
  useGoogleSignInFlow,
  getConnectedGoogleAccountsAsync,
  clearConnectedGoogleAccountsAsync,
} from '@/hooks/auth/useGoogleSignInFlow';
import { LoginCanvaFlow, type LoginStep } from '@/components/auth/login/LoginCanvaFlow';
import { navigateAfterLogin } from '@/utils/auth/navigateAfterLogin';
import { COLORS, SPACING } from '@/app/design-system/tokens';

const LOGO = require('@/assets/images/Group 27logo_negro_mecanimovil.png');

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle } = useAuth();

  const [connectedAccounts, setConnectedAccounts] = useState<
    Awaited<ReturnType<typeof getConnectedGoogleAccountsAsync>>
  >([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [step, setStep] = useState<LoginStep | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleGoogleSuccess = useCallback(
    async (result: { success: boolean; estadoProveedor?: any }) => {
      if (result.success) {
        navigateAfterLogin(router, result.estadoProveedor);
      }
    },
    [router],
  );

  const { googleLoading, signInWithAccountChooser } = useGoogleSignInFlow(
    async (idToken: string, flow?: 'login' | 'register') => {
      const result = await loginWithGoogle(idToken, flow);
      if (result.success) {
        await handleGoogleSuccess(result);
      }
      return result;
    },
    {
      flow: 'login',
      onUserNotFound: (profile?: {
        email?: string;
        given_name?: string;
        family_name?: string;
      }) => {
        router.push({
          pathname: '/registro',
          params: {
            email: profile?.email || '',
            firstName: profile?.given_name || '',
            lastName: profile?.family_name || '',
          },
        } as any);
      },
    },
  );

  const reloadAccounts = async () => {
    const list = await getConnectedGoogleAccountsAsync();
    setConnectedAccounts(list);
    setAccountsLoaded(true);
    return list;
  };

  useEffect(() => {
    reloadAccounts();
  }, []);

  useEffect(() => {
    if (!googleLoading && accountsLoaded) reloadAccounts();
  }, [googleLoading, accountsLoaded]);

  useEffect(() => {
    if (!accountsLoaded) return;
    if (step !== null) return;
    setStep(connectedAccounts.length > 0 ? 'accounts' : 'methods');
  }, [accountsLoaded, connectedAccounts.length, step]);

  const validateEmailForm = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'El correo electrónico es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Correo electrónico no válido';
    if (!password) next.password = 'La contraseña es requerida';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleEmailLogin = async () => {
    if (!validateEmailForm()) return;
    setEmailLoading(true);
    try {
      const { estadoProveedor: estadoActual } = await login(email.trim(), password);
      navigateAfterLogin(router, estadoActual);
    } catch (error: any) {
      showAlert(
        'Error al iniciar sesión',
        error?.message || 'Verifica tus credenciales e intenta nuevamente.',
      );
    } finally {
      setEmailLoading(false);
    }
  };

  const handleClearGoogleAccounts = async () => {
    await clearConnectedGoogleAccountsAsync();
    const fresh = await reloadAccounts();
    if (fresh.length === 0) setStep('methods');
  };

  const goRegister = (prefillEmail?: string) => {
    router.push({
      pathname: '/registro',
      params: { email: prefillEmail || email || '' },
    } as any);
  };

  const scrollContent = (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + SPACING.xl, paddingBottom: insets.bottom + SPACING.xl },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'web' ? undefined : 'on-drag'}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.logoWrap}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </View>

      {step === null ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={COLORS.institutional.primary} />
        </View>
      ) : (
        <LoginCanvaFlow
          step={step}
          connectedAccounts={connectedAccounts}
          googleLoading={googleLoading}
          emailLoading={emailLoading}
          email={email}
          password={password}
          emailError={errors.email}
          passwordError={errors.password}
          onEmailChange={(v) => {
            setEmail(v);
            if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
          }}
          onPasswordChange={(v) => {
            setPassword(v);
            if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
          }}
          onAccountTap={(accountEmail) => {
            if (!googleLoading) signInWithAccountChooser({ loginHint: accountEmail });
          }}
          onUseAnotherGoogle={() => {
            if (!googleLoading) signInWithAccountChooser();
          }}
          onGoMethods={() => setStep('methods')}
          onGoAccounts={() => setStep('accounts')}
          onGoEmail={() => setStep('email')}
          onClearGoogleAccounts={handleClearGoogleAccounts}
          onEmailLogin={handleEmailLogin}
          onGoRegister={goRegister}
        />
      )}
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
    backgroundColor: COLORS.institutional.canvas,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: {
    width: 180,
    height: 48,
  },
  loaderWrap: {
    paddingTop: 60,
    alignItems: 'center',
  },
});

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { ChevronLeft, ChevronRight, Mail, UserMinus } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import type { ConnectedGoogleAccount } from '@/hooks/auth/useGoogleSignInFlow';

export type LoginStep = 'accounts' | 'methods' | 'email';

type Props = {
  step: LoginStep;
  connectedAccounts: ConnectedGoogleAccount[];
  googleLoading: boolean;
  emailLoading: boolean;
  email: string;
  password: string;
  emailError?: string;
  passwordError?: string;
  loginError?: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onAccountTap: (email: string) => void;
  onUseAnotherGoogle: () => void;
  onGoMethods: () => void;
  onGoAccounts: () => void;
  onGoEmail: () => void;
  onClearGoogleAccounts: () => void;
  onEmailLogin: () => void;
  onGoRegister: (email?: string) => void;
};

export function LoginCanvaFlow({
  step,
  connectedAccounts,
  googleLoading,
  emailLoading,
  email,
  password,
  emailError,
  passwordError,
  loginError,
  onEmailChange,
  onPasswordChange,
  onAccountTap,
  onUseAnotherGoogle,
  onGoMethods,
  onGoAccounts,
  onGoEmail,
  onClearGoogleAccounts,
  onEmailLogin,
  onGoRegister,
}: Props) {
  if (step === 'accounts') {
    return (
      <>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>Cuentas guardadas</Text>
          <Text style={styles.h1}>¿Con qué cuenta continuarás hoy?</Text>
          <Text style={styles.subtitle}>
            Selecciona una cuenta para iniciar sesión rápido o usa otra.
          </Text>
        </View>

        <View style={styles.card}>
          {connectedAccounts.map((acc) => {
            const initials = (acc.name || acc.email || '?')
              .split(/\s+/)
              .map((s) => s[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();
            return (
              <TouchableOpacity
                key={acc.email}
                onPress={() => onAccountTap(acc.email)}
                disabled={googleLoading}
                style={[styles.accountRow, webCursor, googleLoading && styles.disabled]}
                activeOpacity={0.7}
              >
                {acc.picture ? (
                  <Image source={{ uri: acc.picture }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
                <View style={styles.accountInfo}>
                  {acc.name ? (
                    <Text style={styles.accountName} numberOfLines={1}>
                      {acc.name}
                    </Text>
                  ) : null}
                  <Text style={styles.accountEmail} numberOfLines={1}>
                    {acc.email}
                  </Text>
                </View>
                {googleLoading ? (
                  <ActivityIndicator size="small" color={COLORS.institutional.primary} />
                ) : (
                  <ChevronRight size={18} color={COLORS.institutional.muted} />
                )}
              </TouchableOpacity>
            );
          })}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>O BIEN</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={onGoMethods}
            disabled={googleLoading}
            style={[styles.btnPrimary, webCursor, googleLoading && styles.disabled]}
            activeOpacity={0.75}
          >
            <Text style={styles.btnPrimaryText}>Usar otra cuenta</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Al continuar, aceptas los Términos de uso de MecaniMóvil Proveedores.
        </Text>

        <TouchableOpacity
          onPress={onClearGoogleAccounts}
          disabled={googleLoading}
          style={[styles.clearBtn, webCursor]}
          activeOpacity={0.7}
        >
          <UserMinus size={14} color={COLORS.institutional.body} style={{ marginRight: 6 }} />
          <Text style={styles.clearBtnText}>Quitar las cuentas</Text>
        </TouchableOpacity>
      </>
    );
  }

  if (step === 'methods') {
    return (
      <>
        {connectedAccounts.length > 0 && (
          <TouchableOpacity onPress={onGoAccounts} style={[styles.backRow, webCursor]} activeOpacity={0.7}>
            <ChevronLeft size={20} color={COLORS.institutional.ink} />
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>
        )}

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>Portal de proveedores</Text>
          <Text style={styles.h1}>Inicia sesión o regístrate</Text>
          <Text style={styles.subtitle}>
            Elige cómo quieres acceder a tu cuenta de proveedor.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Método de acceso</Text>

          <TouchableOpacity
            onPress={onUseAnotherGoogle}
            disabled={googleLoading}
            style={[styles.methodRow, webCursor, googleLoading && styles.disabled]}
            activeOpacity={0.75}
          >
            <View style={[styles.methodIconWrap, styles.methodIconGoogle]}>
              {googleLoading ? (
                <ActivityIndicator size="small" color={COLORS.institutional.ink} />
              ) : (
                <Text style={styles.googleGlyph}>G</Text>
              )}
            </View>
            <View style={styles.methodCopy}>
              <Text style={styles.methodTitle}>Continuar con Google</Text>
              <Text style={styles.methodHint}>Acceso rápido con tu cuenta Google</Text>
            </View>
            <ChevronRight size={18} color={COLORS.institutional.muted} />
          </TouchableOpacity>

          <View style={styles.methodDivider} />

          <TouchableOpacity onPress={onGoEmail} style={[styles.methodRow, webCursor]} activeOpacity={0.75}>
            <View style={styles.methodIconWrap}>
              <Mail size={20} color={COLORS.institutional.ink} />
            </View>
            <View style={styles.methodCopy}>
              <Text style={styles.methodTitle}>Usar correo electrónico</Text>
              <Text style={styles.methodHint}>Inicia sesión o crea tu cuenta</Text>
            </View>
            <ChevronRight size={18} color={COLORS.institutional.muted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Al continuar, aceptas los Términos de uso de MecaniMóvil Proveedores.
        </Text>
      </>
    );
  }

  return (
    <>
      <TouchableOpacity onPress={onGoMethods} style={[styles.backRow, webCursor]} activeOpacity={0.7}>
        <ChevronLeft size={20} color={COLORS.institutional.ink} />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>Acceso</Text>
        <Text style={styles.h1}>Inicia sesión</Text>
        <Text style={styles.subtitle}>
          Usa tu usuario o correo del taller.{' '}
          <Text style={styles.headingLink} onPress={() => onGoRegister(email)}>
            Regístrate aquí
          </Text>
          .
        </Text>
      </View>

      <View style={styles.card}>
        {loginError ? (
          <View style={styles.loginErrorBanner}>
            <Text style={styles.loginErrorText}>{loginError}</Text>
          </View>
        ) : null}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Usuario o correo</Text>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            placeholder="usuario o ejemplo@correo.com"
            placeholderTextColor={COLORS.institutional.mutedSoft}
            value={email}
            onChangeText={onEmailChange}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={[styles.input, passwordError ? styles.inputError : null]}
            placeholder="••••••••"
            placeholderTextColor={COLORS.institutional.mutedSoft}
            value={password}
            onChangeText={onPasswordChange}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>

        <TouchableOpacity
          onPress={onEmailLogin}
          disabled={emailLoading}
          style={[styles.btnPrimary, webCursor, emailLoading && styles.disabled]}
          activeOpacity={0.75}
        >
          {emailLoading ? (
            <ActivityIndicator size="small" color={COLORS.institutional.onPrimary} />
          ) : (
            <Text style={styles.btnPrimaryText}>Iniciar sesión</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Al continuar, aceptas los Términos de uso de MecaniMóvil Proveedores.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: SPACING.xl,
    gap: SPACING.xs,
  },
  eyebrow: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: COLORS.institutional.primary,
  },
  h1: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    lineHeight: 32,
    color: COLORS.institutional.ink,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    lineHeight: 22,
    color: COLORS.institutional.body,
  },
  headingLink: {
    color: COLORS.institutional.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  card: {
    backgroundColor: COLORS.institutional.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.institutional.hairlineSoft,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  cardLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.institutional.muted,
    marginBottom: SPACING.md,
    letterSpacing: 0.2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.institutional.hairlineSoft,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.md,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.institutional.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarInitials: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '700',
    color: COLORS.institutional.primary,
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
    color: COLORS.institutional.ink,
  },
  accountEmail: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.institutional.muted,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.institutional.hairline,
  },
  dividerText: {
    marginHorizontal: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '600',
    color: COLORS.institutional.muted,
    letterSpacing: 0.5,
  },
  btnPrimary: {
    backgroundColor: COLORS.institutional.primary,
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: COLORS.institutional.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '600',
  },
  footer: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.institutional.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  clearBtnText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.institutional.body,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.fixed.xxs,
  },
  backText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.institutional.ink,
    marginLeft: 4,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.institutional.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.institutional.hairlineSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  methodIconGoogle: {
    backgroundColor: COLORS.institutional.surfaceStrong,
  },
  methodCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: SPACING.sm,
  },
  methodTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.institutional.ink,
    marginBottom: 2,
  },
  methodHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 18,
    color: COLORS.institutional.muted,
  },
  methodDivider: {
    height: 1,
    backgroundColor: COLORS.institutional.hairlineSoft,
    marginVertical: SPACING.xs,
  },
  googleGlyph: {
    fontSize: 18,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary[400],
    textAlign: 'center',
  },
  fieldWrap: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
    color: COLORS.institutional.ink,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.institutional.hairline,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.institutional.ink,
    backgroundColor: COLORS.institutional.surfaceSoft,
  },
  inputError: {
    borderColor: COLORS.institutional.semanticDown,
  },
  loginErrorBanner: {
    backgroundColor: COLORS.institutional.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.institutional.semanticDown,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  loginErrorText: {
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.institutional.semanticDown,
    lineHeight: 20,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.institutional.semanticDown,
    marginTop: SPACING.xs,
  },
  disabled: {
    opacity: 0.6,
  },
});

const webCursor =
  Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : null;

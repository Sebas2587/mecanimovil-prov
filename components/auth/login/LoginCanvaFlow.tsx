import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { ChevronLeft, ChevronRight, Mail, UserMinus } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  HostPaperSection,
  HostSectionKicker,
  HostAvatar,
  InstitutionalButton,
} from '@/app/design-system/components';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { ConnectedGoogleAccount } from '@/hooks/auth/useGoogleSignInFlow';
import LegalAcceptanceRow from '@/components/legal/LegalAcceptanceRow';
import { GoogleLogoMark } from '@/components/auth/GoogleLogoMark';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

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
  acceptTerms: boolean;
  onToggleAcceptTerms: () => void;
  termsError?: string;
};

function BackLink({ onPress, label = 'Volver' }: { onPress: () => void; label?: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.backRow, webCursor]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <ChevronLeft size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
      <Text style={styles.backText}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Login Host (Airbnb): kickers, paper única, filas hairline, CTAs InstitutionalButton.
 */
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
  acceptTerms,
  onToggleAcceptTerms,
  termsError,
}: Props) {
  if (step === 'accounts') {
    return (
      <>
        <View style={styles.heading}>
          <HostSectionKicker label="Cuentas guardadas" style={styles.kickerFlush} />
          <Text style={styles.h1}>¿Con qué cuenta continuarás?</Text>
          <Text style={styles.subtitle}>
            Elige una cuenta para entrar rápido o usa otra.
          </Text>
        </View>

        <HostPaperSection style={styles.paper}>
          {connectedAccounts.map((acc, index) => (
            <TouchableOpacity
              key={acc.email}
              onPress={() => onAccountTap(acc.email)}
              disabled={googleLoading || !acceptTerms}
              style={[
                styles.row,
                index < connectedAccounts.length - 1 && styles.rowBorder,
                webCursor,
                (googleLoading || !acceptTerms) && styles.disabled,
              ]}
              activeOpacity={0.7}
            >
              <HostAvatar name={acc.name || acc.email} uri={acc.picture} size={40} />
              <View style={styles.rowCopy}>
                {acc.name ? (
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {acc.name}
                  </Text>
                ) : null}
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {acc.email}
                </Text>
              </View>
              {googleLoading ? (
                <ActivityIndicator size="small" color={I.muted} />
              ) : (
                <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              )}
            </TouchableOpacity>
          ))}

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>o</Text>
            <View style={styles.orLine} />
          </View>

          <InstitutionalButton
            label="Usar otra cuenta"
            variant="secondary"
            onPress={onGoMethods}
            disabled={googleLoading}
          />
        </HostPaperSection>

        <LegalAcceptanceRow
          checked={acceptTerms}
          onToggle={onToggleAcceptTerms}
          error={termsError}
        />

        <TouchableOpacity
          onPress={onClearGoogleAccounts}
          disabled={googleLoading}
          style={[styles.clearBtn, webCursor]}
          activeOpacity={0.7}
        >
          <UserMinus size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.clearBtnText}>Quitar las cuentas</Text>
        </TouchableOpacity>
      </>
    );
  }

  if (step === 'methods') {
    return (
      <>
        {connectedAccounts.length > 0 ? <BackLink onPress={onGoAccounts} /> : null}

        <View style={styles.heading}>
          <HostSectionKicker label="Portal de proveedores" style={styles.kickerFlush} />
          <Text style={styles.h1}>Inicia sesión o regístrate</Text>
          <Text style={styles.subtitle}>
            Elige cómo quieres acceder a tu cuenta.
          </Text>
        </View>

        <HostPaperSection style={styles.paper}>
          <TouchableOpacity
            onPress={onUseAnotherGoogle}
            disabled={googleLoading || !acceptTerms}
            style={[
              styles.row,
              styles.rowBorder,
              webCursor,
              (googleLoading || !acceptTerms) && styles.disabled,
            ]}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Continuar con Google"
          >
            <View style={styles.googleIcon}>
              {googleLoading ? (
                <ActivityIndicator size="small" color={I.ink} />
              ) : (
                <GoogleLogoMark size={20} />
              )}
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Continuar con Google</Text>
              <Text style={styles.rowMeta}>Acceso rápido con tu cuenta Google</Text>
            </View>
            <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onGoEmail}
            disabled={!acceptTerms}
            style={[styles.row, webCursor, !acceptTerms && styles.disabled]}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Usar correo electrónico"
          >
            <View style={styles.mailIcon}>
              <Mail size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Usar correo electrónico</Text>
              <Text style={styles.rowMeta}>Inicia sesión o crea tu cuenta</Text>
            </View>
            <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </HostPaperSection>

        <LegalAcceptanceRow
          checked={acceptTerms}
          onToggle={onToggleAcceptTerms}
          error={termsError}
        />
      </>
    );
  }

  return (
    <>
      <BackLink onPress={onGoMethods} />

      <View style={styles.heading}>
        <HostSectionKicker label="Acceso" style={styles.kickerFlush} />
        <Text style={styles.h1}>Inicia sesión</Text>
        <Text style={styles.subtitle}>
          Usa tu usuario o correo del taller.{' '}
          <Text style={styles.link} onPress={() => onGoRegister(email)}>
            Regístrate aquí
          </Text>
          .
        </Text>
      </View>

      <HostPaperSection style={styles.paper}>
        {loginError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{loginError}</Text>
          </View>
        ) : null}

        <InstitutionalField
          label="Usuario o correo"
          value={email}
          onChangeText={onEmailChange}
          placeholder="usuario o ejemplo@correo.com"
          autoCapitalize="none"
          error={emailError}
          textInputProps={{ autoCorrect: false, keyboardType: 'default' }}
        />

        <View style={styles.fieldGap} />

        <InstitutionalField
          label="Contraseña"
          value={password}
          onChangeText={onPasswordChange}
          placeholder="••••••••"
          autoCapitalize="none"
          error={passwordError}
          textInputProps={{ secureTextEntry: true, autoCorrect: false }}
        />

        <View style={styles.ctaGap} />

        <InstitutionalButton
          label={emailLoading ? 'Entrando…' : 'Iniciar sesión'}
          variant="primary"
          loading={emailLoading}
          disabled={emailLoading || !acceptTerms}
          onPress={onEmailLogin}
        />
      </HostPaperSection>

      <LegalAcceptanceRow
        checked={acceptTerms}
        onToggle={onToggleAcceptTerms}
        error={termsError}
      />
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: SPACING.fixed.lg,
    gap: SPACING.fixed.xs,
  },
  kickerFlush: {
    marginTop: 0,
  },
  h1: {
    fontSize: TS.h3.fontSize,
    lineHeight: Math.round(TS.h3.fontSize * TS.h3.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    letterSpacing: TS.h3.letterSpacing ?? 0,
  },
  subtitle: {
    fontSize: TS.body.fontSize,
    lineHeight: Math.round(TS.body.fontSize * 1.4),
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  link: {
    color: I.primary,
    fontFamily: FF.sansSemiBold,
  },
  paper: {
    marginBottom: SPACING.fixed.lg,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  rowMeta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  googleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: I.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: I.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
  },
  orText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
  },
  clearBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: SPACING.fixed.md,
    gap: 2,
  },
  backText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.ink,
  },
  fieldGap: {
    height: SPACING.fixed.md,
  },
  ctaGap: {
    height: SPACING.fixed.lg,
  },
  errorBanner: {
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.semanticDown,
    padding: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  errorBannerText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.semanticDown,
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.55,
  },
});

const webCursor =
  Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : null;

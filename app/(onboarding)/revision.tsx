import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  OnboardingScreenLayout,
  OnboardingPrimaryButton,
  OnboardingNotice,
} from '@/components/onboarding';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { COLORS } from '@/app/design-system/tokens';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';

const I = COLORS.institutional;

export default function RevisionScreen() {
  const { tipo } = useLocalSearchParams();
  const router = useRouter();
  const { logout } = useAuth();

  const handleVolverLogin = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  const tipoLabel = tipo === 'taller' ? 'taller mecánico' : 'mecánico a domicilio';

  return (
    <OnboardingScreenLayout
      footer={<OnboardingPrimaryButton label="Volver al inicio de sesión" onPress={handleVolverLogin} />}
    >
      <View style={styles.hero}>
        <View style={styles.iconRing}>
          <InstitutionalIcon name="checkmark-circle" size={72} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <Text style={styles.title}>Registro completado</Text>
        <Text style={styles.subtitle}>
          Tu solicitud como {tipoLabel} fue enviada correctamente.
        </Text>
      </View>

      <View style={onboardingStyles.panel}>
        <InfoRow icon="time" color={I.primary} title="Tiempo de revisión">
          Nuestro equipo revisará tu solicitud en 24–48 horas hábiles.
        </InfoRow>
        <InfoRow icon="document-text" color={I.accentYellow} title="Verificación de documentos">
          Validaremos la autenticidad de los documentos y la información proporcionada.
        </InfoRow>
        <InfoRow icon="mail" color={I.primary} title="Notificación por correo">
          Te avisaremos por email con el resultado de la revisión.
        </InfoRow>
        <InfoRow icon="shield-checkmark" color={I.semanticUp} title="Activación de cuenta" last>
          Una vez aprobado, podrás acceder y recibir solicitudes de servicio.
        </InfoRow>
      </View>

      <View style={[onboardingStyles.panel, styles.stepsPanel]}>
        <InstitutionalSectionHeader title="Próximos pasos" />
        <Step n={1}>Mantén tu correo activo para recibir notificaciones.</Step>
        <Step n={2}>
          Prepara tu {tipo === 'taller' ? 'taller' : 'equipo'} para atender clientes.
        </Step>
        <Step n={3}>Cuando estés aprobado, ingresa a la app y comienza a trabajar.</Step>
      </View>

      <OnboardingNotice>
        ¿Tienes preguntas? Escríbenos a{' '}
        <Text style={styles.contactEmail}>soporte@mecanimovil.com</Text>
      </OnboardingNotice>
    </OnboardingScreenLayout>
  );
}

function InfoRow({
  icon,
  color,
  title,
  children,
  last,
}: {
  icon: React.ComponentProps<typeof InstitutionalIcon>['name'];
  color: string;
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <InstitutionalIcon name={icon} size={22} color={color} strokeWidth={ICON_STROKE_WIDTH} />
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoBody}>{children}</Text>
      </View>
    </View>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: I.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: I.muted,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: I.hairline,
  },
  infoCopy: { flex: 1 },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: I.ink,
    marginBottom: 4,
  },
  infoBody: { fontSize: 14, color: I.muted, lineHeight: 20 },
  stepsPanel: { marginTop: 16 },
  stepRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepBadgeText: { color: I.onPrimary, fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14, color: I.body, lineHeight: 20 },
  contactEmail: { color: I.primary, fontWeight: '600' },
});

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import OnboardingHeader from '@/components/OnboardingHeader';
import {
  OnboardingScreenLayout,
  OnboardingPrimaryButton,
  OnboardingNotice,
} from '@/components/onboarding';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS } from '@/app/design-system/tokens';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';
import { appendOnboardingParams } from '@/utils/onboardingNavigation';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;

type ModoCobertura = 'multimarca' | 'especialista';

export default function CoberturaMarcasScreen() {
  const { tipo, ...otherParams } = useLocalSearchParams();
  const router = useRouter();
  const [modo, setModo] = useState<ModoCobertura | null>(null);
  const { height } = useWindowDimensions();
  const isCompact = height < 760;

  const tipoStr = useMemo(
    () => (Array.isArray(tipo) ? tipo[0] : tipo) as string | undefined,
    [tipo]
  );

  const buildParams = () => {
    const params = new URLSearchParams();
    appendOnboardingParams(params, { ...otherParams, tipo: tipoStr });
    return params;
  };

  const getBackPath = () => {
    const params = buildParams();
    return `/(onboarding)/informacion-basica?${params.toString()}`;
  };

  const handleContinuar = () => {
    if (!modo) {
      showAlert('Elige un tipo de cobertura', 'Selecciona Multimarca o Especialista para continuar.');
      return;
    }

    if (!tipoStr || (tipoStr !== 'taller' && tipoStr !== 'mecanico')) {
      showAlert('Error', 'Tipo de proveedor no válido. Por favor, vuelve al inicio.');
      router.replace('/(onboarding)/tipo-cuenta');
      return;
    }

    const params = buildParams();
    params.append('es_multimarca', modo === 'multimarca' ? 'true' : 'false');

    if (modo === 'multimarca') {
      params.append('marcas', JSON.stringify([]));
      router.push(`/(onboarding)/catalogo-servicios-marcas?${params.toString()}` as any);
      return;
    }

    router.push(`/(onboarding)/seleccion-marcas?${params.toString()}` as any);
  };

  const footerLabel = modo === 'multimarca'
    ? 'Continuar a servicios'
    : modo === 'especialista'
      ? 'Elegir marcas'
      : 'Selecciona una opción';

  return (
    <OnboardingScreenLayout
      scrollProps={{ scrollEnabled: false, bounces: false }}
      footer={
        <OnboardingPrimaryButton
          label={footerLabel}
          onPress={handleContinuar}
          disabled={!modo}
        />
      }
    >
      <OnboardingHeader
        title="Tipo de cobertura"
        subtitle="Elige cómo quieres aparecer en las búsquedas de clientes."
        currentStep={3}
        totalSteps={modo === 'especialista' ? 6 : 5}
        icon="car"
        backPath={getBackPath()}
      />

      <View style={styles.optionsStack}>
        <TouchableOpacity
          style={[onboardingStyles.optionCard, modo === 'multimarca' && onboardingStyles.optionCardSelected]}
          onPress={() => setModo('multimarca')}
          activeOpacity={0.85}
        >
          <View style={[onboardingStyles.optionCardBody, isCompact && styles.compactCardBody]}>
            <View style={onboardingStyles.optionHeaderRow}>
              <InstitutionalIcon
                name="globe-outline"
                size={24}
                color={modo === 'multimarca' ? I.primary : I.muted}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              <Text
                style={[
                  onboardingStyles.optionTitle,
                  modo === 'multimarca' && onboardingStyles.optionTitleSelected,
                ]}
              >
                Multimarca
              </Text>
            </View>
            <Text style={onboardingStyles.optionDescription}>
              Atiendes vehículos de cualquier marca. Ideal si tu taller o servicio es generalista.
            </Text>
            {isCompact ? (
              <Text style={styles.compactHint}>Pasas directo a configurar servicios.</Text>
            ) : (
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• No eliges marcas en el siguiente paso</Text>
                <Text style={styles.bullet}>• Pasas directo a configurar servicios</Text>
                <Text style={styles.bullet}>• Mayor alcance en búsquedas</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[onboardingStyles.optionCard, modo === 'especialista' && onboardingStyles.optionCardSelected]}
          onPress={() => setModo('especialista')}
          activeOpacity={0.85}
        >
          <View style={[onboardingStyles.optionCardBody, isCompact && styles.compactCardBody]}>
            <View style={onboardingStyles.optionHeaderRow}>
              <InstitutionalIcon
                name="car-outline"
                size={24}
                color={modo === 'especialista' ? I.primary : I.muted}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              <Text
                style={[
                  onboardingStyles.optionTitle,
                  modo === 'especialista' && onboardingStyles.optionTitleSelected,
                ]}
              >
                Especialista
              </Text>
            </View>
            <Text style={onboardingStyles.optionDescription}>
              Atiendes solo marcas específicas. Te mostramos a usuarios con esos vehículos.
            </Text>
            {isCompact ? (
              <Text style={styles.compactHint}>Luego eliges hasta 5 marcas.</Text>
            ) : (
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Eliges hasta 5 marcas en la siguiente pantalla</Text>
                <Text style={styles.bullet}>• Más relevancia para esas marcas</Text>
                <Text style={styles.bullet}>• Evitas consultas fuera de tu especialidad</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.noticeWrap}>
        <OnboardingNotice>
          {modo === 'multimarca'
            ? 'Siguiente paso: catálogo de servicios (sin selección de marcas).'
            : modo === 'especialista'
              ? 'Siguiente paso: pantalla dedicada para elegir tus marcas.'
              : 'Debes elegir una opción antes de continuar.'}
        </OnboardingNotice>
      </View>
    </OnboardingScreenLayout>
  );
}

const styles = StyleSheet.create({
  optionsStack: {
    gap: 12,
  },
  noticeWrap: {
    marginTop: 12,
  },
  compactCardBody: {
    paddingVertical: 12,
  },
  bulletList: {
    marginTop: 8,
    gap: 4,
  },
  bullet: {
    fontSize: 13,
    color: I.muted,
    lineHeight: 18,
  },
  compactHint: {
    marginTop: 8,
    fontSize: 13,
    color: I.muted,
    lineHeight: 18,
  },
});

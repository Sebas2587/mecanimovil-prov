import React, { useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
import { useOnboardingDraft } from '@/context/OnboardingDraftContext';
import { buildOnboardingHref, clearModalityDownstreamSelections, mergeRouteParamsIntoDraft } from '@/utils/onboardingDraftParams';
import { readRouteParam } from '@/utils/extractApiList';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;

type ModoCobertura = 'multimarca' | 'especialista';

export default function CoberturaMarcasScreen() {
  const rawParams = useLocalSearchParams();
  const { tipo, ...otherParams } = rawParams;
  const router = useRouter();
  const { draft, patchDraft } = useOnboardingDraft();
  const [modo, setModo] = useState<ModoCobertura | null>(null);
  const { height } = useWindowDimensions();
  const isCompact = height < 760;

  const tipoStr = useMemo(
    () => (Array.isArray(tipo) ? tipo[0] : tipo) as string | undefined,
    [tipo]
  );

  const esMultimarcaParamKey = readRouteParam(rawParams.es_multimarca) ?? '';
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useFocusEffect(
    useCallback(() => {
      const partial = mergeRouteParamsIntoDraft(
        draftRef.current,
        rawParams as Record<string, string | string[] | undefined>,
      );
      if (Object.keys(partial).length > 0) {
        patchDraft(partial);
      }
      const merged = { ...draftRef.current, ...partial };
      if (merged.es_multimarca === true) setModo('multimarca');
      else if (merged.es_multimarca === false) setModo('especialista');
    }, [esMultimarcaParamKey, patchDraft, rawParams]),
  );

  const selectModo = (next: ModoCobertura) => {
    const nextEsMultimarca = next === 'multimarca';
    const prevEsMultimarca = draftRef.current.es_multimarca;
    const modalityChanged =
      prevEsMultimarca !== null && prevEsMultimarca !== nextEsMultimarca;

    setModo(next);

    if (modalityChanged) {
      patchDraft({
        es_multimarca: nextEsMultimarca,
        ...clearModalityDownstreamSelections(),
      });
      return;
    }

    patchDraft({ es_multimarca: nextEsMultimarca });
  };

  const getBackPath = () => buildOnboardingHref('/(onboarding)/informacion-basica', draft);

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

    const isMultimarca = modo === 'multimarca';
    const merged = {
      ...draft,
      ...mergeRouteParamsIntoDraft(draft, rawParams as Record<string, string | string[] | undefined>),
    };

    const nextDraft = {
      ...merged,
      es_multimarca: isMultimarca,
      marcas: isMultimarca ? [] : merged.marcas,
      marcas_meta: isMultimarca ? [] : merged.marcas_meta,
    };

    patchDraft({
      es_multimarca: nextDraft.es_multimarca,
      marcas: nextDraft.marcas,
      marcas_meta: nextDraft.marcas_meta,
      servicios_seleccionados: nextDraft.servicios_seleccionados,
    });

    if (modo === 'multimarca') {
      router.push(buildOnboardingHref('/(onboarding)/catalogo-servicios-marcas', nextDraft) as any);
      return;
    }

    router.push(buildOnboardingHref('/(onboarding)/seleccion-marcas', nextDraft) as any);
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
          onPress={() => selectModo('multimarca')}
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
          onPress={() => selectModo('especialista')}
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

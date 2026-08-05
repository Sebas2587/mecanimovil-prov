import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Zap, ChevronRight } from 'lucide-react-native';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import {
  HostSectionKicker,
  HostPaperSection,
  InstitutionalTag,
  InstitutionalText,
  hostIconPlateStyle,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { router } from 'expo-router';

const I = COLORS.institutional;

export function MarketplaceRequestsSection() {
  const handleIrASolicitudes = useCallback(() => {
    router.push('/solicitudes-disponibles');
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <HostSectionKicker label="Solicitudes Marketplace B2C" />
        <TouchableOpacity onPress={handleIrASolicitudes} activeOpacity={0.7}>
          <InstitutionalText role="navLink" color="primary">
            Ver Todas
          </InstitutionalText>
        </TouchableOpacity>
      </View>

      <HostPaperSection style={styles.paperBox}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={handleIrASolicitudes}
          activeOpacity={0.8}
        >
          <View style={hostIconPlateStyle}>
            <Zap size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <InstitutionalText role="bodyBold">Explorar Solicitudes Cercanas</InstitutionalText>
              <InstitutionalTag label="B2C Activo" variant="warning" size="sm" />
            </View>

            <InstitutionalText role="caption" color="body" style={styles.subText}>
              Clientes buscando servicio mecánico en tu zona de cobertura a través de la app Mecanimóvil Usuarios.
            </InstitutionalText>

            <View style={styles.actionPrompt}>
              <InstitutionalText role="caption" color="primary">
                Revisar y Enviar Oferta Expres
              </InstitutionalText>
              <ChevronRight size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
          </View>
        </TouchableOpacity>
      </HostPaperSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.fixed.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.xs,
  },
  paperBox: {},
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: SPACING.fixed.xs,
  },
  subText: {
    lineHeight: 18,
    marginBottom: SPACING.fixed.sm,
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

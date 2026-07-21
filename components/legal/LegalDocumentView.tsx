import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FileText, ShieldCheck } from 'lucide-react-native';
import { AppHeader } from '@/app/design-system/components/AppHeader';
import { Card } from '@/app/design-system/components/Card';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import {
  hostIconPlateColor,
  hostIconPlateStyle,
} from '@/app/design-system/styles/institutionalSemantic';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';

type Section = { title: string; content: string };

type Props = {
  meta: { title: string; subtitle?: string; lastUpdated: string };
  sections: Section[];
  footer?: { title: string; content: string };
  embedded?: boolean;
};

function resolveDocIcon(title: string) {
  return title.toLowerCase().includes('privacidad') ? ShieldCheck : FileText;
}

function LegalDocumentBody({
  meta,
  sections,
  footer,
  embedded = false,
}: Omit<Props, 'embedded'> & { embedded?: boolean }) {
  const DocIcon = resolveDocIcon(meta.title);

  return (
    <ScrollView
      style={[styles.scroll, Platform.OS === 'web' && styles.scrollWeb]}
      contentContainerStyle={[
        styles.scrollContent,
        embedded && styles.scrollContentEmbedded,
      ]}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <Card padding="lg" elevated style={styles.introCard}>
        <View style={styles.introIconPlate}>
          <DocIcon size={26} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <InstitutionalText role="h4" style={styles.introTitle}>
          {meta.title}
        </InstitutionalText>
        {meta.subtitle ? (
          <InstitutionalText role="captionBold" color="body" style={styles.introSubtitle}>
            {meta.subtitle}
          </InstitutionalText>
        ) : null}
        <InstitutionalText role="caption" color="muted" style={styles.introUpdated}>
          Última actualización: {meta.lastUpdated}
        </InstitutionalText>
      </Card>

      <Card padding="lg" elevated style={styles.documentCard}>
        {sections.map((section, index) => (
          <View
            key={section.title}
            style={[
              styles.section,
              index < sections.length - 1 && styles.sectionDivider,
              index === sections.length - 1 && !footer && styles.sectionLast,
            ]}
          >
            <InstitutionalText role="h5" style={styles.sectionTitle}>
              {section.title}
            </InstitutionalText>
            <InstitutionalText role="caption" color="body" style={styles.sectionBody}>
              {section.content}
            </InstitutionalText>
          </View>
        ))}

        {footer ? (
          <View style={styles.footerBox}>
            <InstitutionalText role="h5" color="primary" style={styles.footerTitle}>
              {footer.title}
            </InstitutionalText>
            <InstitutionalText role="caption" color="body" style={styles.footerBody}>
              {footer.content}
            </InstitutionalText>
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
}

export default function LegalDocumentView({ meta, sections, footer, embedded = false }: Props) {
  const router = useRouter();

  const body = (
    <LegalDocumentBody
      meta={meta}
      sections={sections}
      footer={footer}
      embedded={embedded}
    />
  );

  if (embedded) {
    return <View style={styles.embeddedRoot}>{body}</View>;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <AppHeader title={meta.title} showBack onBackPress={() => router.back()} />
      {body}
    </SafeAreaView>
  );
}

const C = COLORS;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background.default,
  },
  embeddedRoot: {
    flex: 1,
    minHeight: 0,
    backgroundColor: C.background.default,
  },
  scroll: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  scrollWeb: {
    ...(Platform.OS === 'web'
      ? {
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }
      : {}),
  },
  scrollContent: {
    padding: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.lg,
  },
  scrollContentEmbedded: {
    paddingBottom: SPACING.fixed.md,
  },
  introCard: {
    alignItems: 'center',
    marginBottom: SPACING.fixed.md,
  },
  introIconPlate: {
    ...hostIconPlateStyle,
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: SPACING.fixed.sm,
  },
  introTitle: {
    textAlign: 'center',
    marginBottom: SPACING.fixed.xs,
  },
  introSubtitle: {
    textAlign: 'center',
    marginBottom: SPACING.fixed.xs,
  },
  introUpdated: {
    textAlign: 'center',
  },
  documentCard: {},
  section: {
    paddingBottom: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
  },
  sectionDivider: {
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: C.border.light,
  },
  sectionLast: {
    marginBottom: 0,
    paddingBottom: 0,
  },
  sectionTitle: {
    marginBottom: SPACING.fixed.xs,
  },
  sectionBody: {
    lineHeight: 22,
  },
  footerBox: {
    marginTop: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    backgroundColor: C.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: C.primary[200],
  },
  footerTitle: {
    marginBottom: SPACING.fixed.xs,
  },
  footerBody: {
    lineHeight: 22,
  },
});

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

type Section = { title: string; content: string };

type Props = {
  meta: { title: string; subtitle?: string; lastUpdated: string };
  sections: Section[];
  footer?: { title: string; content: string };
  embedded?: boolean;
};

export default function LegalDocumentView({ meta, sections, footer, embedded = false }: Props) {
  const body = (
    <>
      {!embedded ? <Stack.Screen options={{ title: meta.title, headerShown: true }} /> : null}
      <ScrollView
        contentContainerStyle={[styles.container, embedded && styles.embeddedContainer]}
        nestedScrollEnabled={embedded}
      >
        <View style={styles.intro}>
          {meta.subtitle ? <Text style={styles.subtitle}>{meta.subtitle}</Text> : null}
          <Text style={styles.updated}>Última actualización: {meta.lastUpdated}</Text>
        </View>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.content}</Text>
          </View>
        ))}
        {footer ? (
          <View style={styles.footer}>
            <Text style={styles.sectionTitle}>{footer.title}</Text>
            <Text style={styles.sectionBody}>{footer.content}</Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  );

  return body;
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.container.horizontal,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.background.default,
  },
  embeddedContainer: {
    paddingTop: SPACING.md,
  },
  intro: { marginBottom: SPACING.lg },
  subtitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.primary,
  },
  updated: {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  section: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border?.default,
  },
  sectionTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.base,
    marginBottom: SPACING.xs,
    color: COLORS.text.primary,
  },
  sectionBody: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    color: COLORS.text.secondary,
  },
  footer: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.background.paper,
  },
});

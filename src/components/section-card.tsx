import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette, radius, shadow, spacing, typography } from '@/constants/theme';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: palette.text,
    fontSize: typography.section,
    fontWeight: '700',
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});

import { StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});

import { StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
}

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.helper}>{helper}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    minWidth: 140,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  value: {
    color: palette.accentStrong,
    fontSize: 28,
    fontWeight: '800',
  },
  label: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  helper: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});

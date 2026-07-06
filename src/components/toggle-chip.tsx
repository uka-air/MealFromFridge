import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

interface ToggleChipProps {
  label?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  activeLabel: string;
  inactiveLabel: string;
}

export function ToggleChip({
  label,
  value,
  onChange,
  activeLabel,
  inactiveLabel,
}: ToggleChipProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        onPress={() => onChange(!value)}
        style={[styles.chip, value ? styles.chipActive : styles.chipInactive]}>
        <Text style={[styles.chipLabel, value ? styles.chipLabelActive : styles.chipLabelInactive]}>
          {value ? activeLabel : inactiveLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  chipInactive: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipLabelActive: {
    color: palette.accentStrong,
  },
  chipLabelInactive: {
    color: palette.textMuted,
  },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

export interface SelectOption<T extends string> {
  label: string;
  value: T;
}

interface ChipSelectProps<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}

export function ChipSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: ChipSelectProps<T>) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionsRow}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.option, selected && styles.optionSelected]}>
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionSelected: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  optionLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: palette.accentStrong,
  },
});

import {
  StyleSheet,
  Text,
  TextInput,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  autoCapitalize = 'sentences',
}: FormFieldProps) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        style={[styles.input, multiline && styles.multiline]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    color: palette.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  multiline: {
    minHeight: 100,
  },
});

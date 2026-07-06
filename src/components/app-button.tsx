import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: AppButtonProps) {
  const variantStyle = {
    primary: styles.primary,
    secondary: styles.secondary,
    danger: styles.danger,
    ghost: styles.ghost,
  }[variant];

  const variantLabelStyle = {
    primary: styles.primaryLabel,
    secondary: styles.secondaryLabel,
    danger: styles.dangerLabel,
    ghost: styles.ghostLabel,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <Text style={[styles.label, variantLabelStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primary: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  secondary: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
  },
  danger: {
    backgroundColor: palette.dangerSoft,
    borderColor: palette.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: palette.border,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryLabel: {
    color: palette.surface,
  },
  secondaryLabel: {
    color: palette.text,
  },
  dangerLabel: {
    color: palette.danger,
  },
  ghostLabel: {
    color: palette.textMuted,
  },
});

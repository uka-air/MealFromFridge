import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

interface FavoriteButtonProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

export function FavoriteButton({
  value,
  onChange,
  label,
}: FavoriteButtonProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? 'Remove favorite' : 'Add favorite'}
        accessibilityState={{ selected: value }}
        onPress={() => onChange(!value)}
        style={[styles.button, value ? styles.buttonActive : styles.buttonInactive]}>
        <SymbolView
          fallback={<Text style={[styles.fallbackIcon, value ? styles.iconActive : styles.iconInactive]}>♥</Text>}
          name={{
            ios: value ? 'heart.fill' : 'heart',
            android: value ? 'favorite' : 'favorite_border',
            web: value ? 'favorite' : 'favorite_border',
          }}
          size={20}
          tintColor={palette.danger}
        />
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
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: palette.dangerSoft,
    borderColor: palette.danger,
  },
  buttonInactive: {
    backgroundColor: palette.surface,
    borderColor: palette.danger,
  },
  fallbackIcon: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  iconActive: {
    color: palette.danger,
  },
  iconInactive: {
    color: palette.danger,
  },
});

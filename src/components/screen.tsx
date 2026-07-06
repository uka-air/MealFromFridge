import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, spacing, typography } from '@/constants/theme';

interface ScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Screen({ title, subtitle, children }: ScreenProps) {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    color: palette.text,
    fontSize: typography.title,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
  },
});

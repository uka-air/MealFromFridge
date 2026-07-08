import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { palette, radius, spacing } from '@/constants/theme';
import { useCookingSessionStore } from '@/store/useCookingSessionStore';

export function CookingUndoBanner() {
  const pendingUndoHistory = useCookingSessionStore((state) => state.pendingUndoHistory);
  const undoLatestCooking = useCookingSessionStore((state) => state.undoLatestCooking);

  if (!pendingUndoHistory) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.copyBlock}>
        <Text style={styles.title}>ตัดสต็อกแล้ว</Text>
        <Text style={styles.subtitle}>{pendingUndoHistory.recipeName}</Text>
      </View>
      <AppButton label="Undo" onPress={undoLatestCooking} variant="ghost" />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderColor: palette.success,
    backgroundColor: palette.successSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  copyBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: palette.success,
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.text,
    fontSize: 13,
  },
});

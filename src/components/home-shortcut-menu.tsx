import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette, radius, shadow, spacing } from "@/constants/theme";

export interface HomeShortcutMenuItem {
  key: string;
  label: string;
  helper?: string;
  isActive?: boolean;
  onPress: () => void;
}

interface HomeShortcutMenuProps {
  items: HomeShortcutMenuItem[];
}

export function HomeShortcutMenu({ items }: HomeShortcutMenuProps) {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  const handleSelect = (item: HomeShortcutMenuItem) => {
    closeMenu();
    item.onPress();
  };

  return (
    <>
      <Pressable
        accessibilityLabel="Open shortcut menu"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.triggerButton,
          pressed && styles.triggerButtonPressed,
        ]}
      >
        <View style={styles.triggerIcon}>
          <View style={styles.triggerLine} />
          <View style={styles.triggerLine} />
          <View style={styles.triggerLine} />
        </View>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={closeMenu}
        transparent
        visible={isOpen}
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />

          <View
            pointerEvents="box-none"
            style={[
              styles.menuPositioner,
              {
                paddingTop: insets.top + 56,
              },
            ]}
          >
            <View style={styles.menuCard}>
              <Text style={styles.menuTitle}>ทางลัด</Text>
              <View style={styles.menuList}>
                {items.map((item) => (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [
                      styles.menuItem,
                      item.isActive && styles.menuItemActive,
                      pressed && styles.menuItemPressed,
                    ]}
                  >
                    <View style={styles.menuTextGroup}>
                      <Text
                        style={[
                          styles.menuLabel,
                          item.isActive && styles.menuLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.helper ? (
                        <Text style={styles.menuHelper}>{item.helper}</Text>
                      ) : null}
                    </View>
                    {item.isActive ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeLabel}>ใช้อยู่</Text>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    padding: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerButtonPressed: {
    opacity: 0.72,
  },
  triggerIcon: {
    width: 18,
    gap: 3,
  },
  triggerLine: {
    height: 2,
    backgroundColor: palette.text,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(44, 33, 27, 0.16)",
  },
  menuPositioner: {
    paddingHorizontal: spacing.lg,
    alignItems: "flex-end",
  },
  menuCard: {
    width: 280,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  menuTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
  },
  menuList: {
    gap: spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  menuItemActive: {
    backgroundColor: palette.accentSoft,
  },
  menuItemPressed: {
    opacity: 0.88,
  },
  menuTextGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  menuLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  menuLabelActive: {
    color: palette.accentStrong,
  },
  menuHelper: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  activeBadge: {
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  activeBadgeLabel: {
    color: palette.accentStrong,
    fontSize: 11,
    fontWeight: "800",
  },
});

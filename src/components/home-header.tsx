import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette, spacing, typography } from "@/constants/theme";
import {
  HomeShortcutMenu,
  type HomeShortcutMenuItem,
} from "@/components/home-shortcut-menu";

interface HomeHeaderProps {
  title: string;
  menuItems: HomeShortcutMenuItem[];
}

export function HomeHeader({ title, menuItems }: HomeHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.row}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <View style={styles.menuSlot}>
          <HomeShortcutMenu items={menuItems} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  row: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  title: {
    color: palette.text,
    fontSize: typography.title,
    fontWeight: "800",
    textAlign: "center",
  },
  menuSlot: {
    position: "absolute",
    right: 0,
    justifyContent: "center",
    alignItems: "center",
  },
});

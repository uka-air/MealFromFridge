import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { palette, radius, shadow, spacing } from "@/constants/theme";
import type { Recipe } from "@/types/recipe";

interface RecipeCardProps {
  recipe: Recipe;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  footer?: ReactNode;
}

export function RecipeCard({
  recipe,
  onPress,
  onEdit,
  onDelete,
  footer,
}: RecipeCardProps) {
  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{recipe.name}</Text>
        <Text style={styles.meta}>
          {recipe.ingredients.length} ingredients • {recipe.instructions.length}{" "}
          steps
        </Text>
      </View>

      {recipe.description ? (
        <Text style={styles.description}>{recipe.description}</Text>
      ) : null}

      <View style={styles.metaRow}>
        <View style={styles.statPill}>
          <Text style={styles.statText}>
            {recipe.prepMinutes + recipe.cookMinutes} นาที
          </Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statText}>{recipe.servings} จาน</Text>
        </View>
      </View>

      {recipe.tags.length ? (
        <View style={styles.tagRow}>
          {recipe.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {footer ? <View style={styles.footer}>{footer}</View> : null}

      {onEdit || onDelete ? (
        <View style={styles.actionsRow}>
          {onEdit ? (
            <AppButton
              label="Edit"
              onPress={onEdit}
              style={styles.actionButton}
              variant="secondary"
            />
          ) : null}
          {onDelete ? (
            <AppButton
              label="Delete"
              onPress={onDelete}
              style={styles.actionButton}
              variant="danger"
            />
          ) : null}
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  cardPressed: {
    opacity: 0.92,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
  },
  meta: {
    color: palette.textMuted,
    fontSize: 14,
  },
  description: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statPill: {
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    borderRadius: radius.pill,
    backgroundColor: palette.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagText: {
    color: palette.accentStrong,
    fontSize: 12,
    fontWeight: "700",
  },
  footer: {
    gap: spacing.xs,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});

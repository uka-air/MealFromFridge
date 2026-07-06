import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ToggleChip } from '@/components/toggle-chip';
import { palette, radius, shadow, spacing } from '@/constants/theme';
import type { Recipe } from '@/types/recipe';

interface RecipeListItemProps {
  recipe: Recipe;
  onPress: () => void;
  onDelete: () => void;
  onToggleFavorite: (value: boolean) => void;
}

function getMainIngredients(recipe: Recipe) {
  const mainIngredients = recipe.ingredients
    .filter((ingredient) => !ingredient.optional)
    .map((ingredient) => ingredient.ingredientName);

  if (!mainIngredients.length) {
    return 'No ingredients listed';
  }

  if (mainIngredients.length <= 3) {
    return mainIngredients.join(', ');
  }

  return `${mainIngredients.slice(0, 3).join(', ')} +${mainIngredients.length - 3} more`;
}

export function RecipeListItem({
  recipe,
  onPress,
  onDelete,
  onToggleFavorite,
}: RecipeListItemProps) {
  return (
    <View style={[styles.card, recipe.isFavorite && styles.cardFavorite]}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.content, pressed && styles.pressed]}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{recipe.name}</Text>
            <Text style={styles.meta}>Cook time: {recipe.cookMinutes} min</Text>
          </View>
          {recipe.isFavorite ? (
            <View style={styles.favoriteBadge}>
              <Text style={styles.favoriteBadgeText}>Favorite</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.ingredientsText}>Main ingredients: {getMainIngredients(recipe)}</Text>

        {recipe.tags.length ? (
          <View style={styles.tagRow}>
            {recipe.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagLabel}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>

      <View style={styles.actionsRow}>
        <ToggleChip
          activeLabel="Favorite"
          inactiveLabel="Not favorite"
          onChange={onToggleFavorite}
          value={recipe.isFavorite}
        />
        <AppButton label="Delete" onPress={onDelete} style={styles.deleteButton} variant="danger" />
      </View>
    </View>
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
  cardFavorite: {
    borderColor: palette.accent,
    backgroundColor: '#FFF9F5',
  },
  content: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    color: palette.textMuted,
    fontSize: 14,
  },
  ingredientsText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  favoriteBadge: {
    borderRadius: radius.pill,
    backgroundColor: palette.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  favoriteBadgeText: {
    color: palette.accentStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  deleteButton: {
    minWidth: 120,
  },
});

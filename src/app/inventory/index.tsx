import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { IngredientCard } from '@/components/ingredient-card';
import { Screen } from '@/components/screen';
import { palette, spacing } from '@/constants/theme';
import type { Ingredient } from '@/types/ingredient';
import { useInventoryStore } from '@/store/useInventoryStore';
import { getDaysUntil } from '@/utils/date';

function getSortPriority(ingredient: Ingredient) {
  if (!ingredient.expiresAt) {
    return Number.POSITIVE_INFINITY;
  }

  const days = getDaysUntil(ingredient.expiresAt);
  return Number.isNaN(days) ? Number.POSITIVE_INFINITY : days;
}

export default function InventoryScreen() {
  const router = useRouter();
  const ingredients = useInventoryStore((state) => state.ingredients);
  const removeIngredient = useInventoryStore((state) => state.removeIngredient);

  const sortedIngredients = [...ingredients].sort((left, right) => {
    const dayDifference = getSortPriority(left) - getSortPriority(right);
    if (dayDifference !== 0) {
      return dayDifference;
    }

    return left.name.localeCompare(right.name);
  });

  const handleDelete = (ingredient: Ingredient) => {
    Alert.alert(
      'Delete ingredient?',
      `Remove ${ingredient.name} from your inventory?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeIngredient(ingredient.id),
        },
      ]
    );
  };

  return (
    <Screen
      title="Inventory"
      subtitle="Track what is already in the fridge, pantry, or freezer so suggestions stay grounded in real ingredients.">
      <View style={styles.actionsRow}>
        <AppButton label="Add ingredient" onPress={() => router.push('/inventory/ingredient-form')} />
        <AppButton
          label="View suggestions"
          onPress={() => router.push('/suggestions')}
          variant="secondary"
        />
      </View>

      {sortedIngredients.length ? (
        <View style={styles.listGroup}>
          {sortedIngredients.map((ingredient) => (
            <IngredientCard
              ingredient={ingredient}
              key={ingredient.id}
              onDelete={() => handleDelete(ingredient)}
              onEdit={() =>
                router.push({
                  pathname: '/inventory/ingredient-form',
                  params: { id: ingredient.id },
                })
              }
            />
          ))}
        </View>
      ) : (
        <EmptyState
          description="Add a few ingredients with quantities and optional expiry dates. This becomes the foundation for recipe matching."
          title="Your inventory is empty"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  listGroup: {
    gap: spacing.md,
  },
});

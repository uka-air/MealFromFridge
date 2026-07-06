import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { IngredientCard } from '@/components/ingredient-card';
import { Screen } from '@/components/screen';
import { spacing } from '@/constants/theme';
import type { Ingredient } from '@/types/ingredient';
import { useInventoryStore } from '@/store/useInventoryStore';

export default function InventoryScreen() {
  const router = useRouter();
  const sortedIngredients = useInventoryStore((state) => state.ingredients);
  const deleteIngredient = useInventoryStore((state) => state.deleteIngredient);

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
          onPress: () => deleteIngredient(ingredient.id),
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

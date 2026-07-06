import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { RecipeCard } from '@/components/recipe-card';
import { Screen } from '@/components/screen';
import { spacing } from '@/constants/theme';
import type { Recipe } from '@/types/recipe';
import { useRecipeStore } from '@/store/useRecipeStore';

export default function RecipesScreen() {
  const router = useRouter();
  const recipes = useRecipeStore((state) => state.recipes);
  const removeRecipe = useRecipeStore((state) => state.removeRecipe);

  const sortedRecipes = [...recipes].sort((left, right) => left.name.localeCompare(right.name));

  const handleDelete = (recipe: Recipe) => {
    Alert.alert('Delete recipe?', `Remove ${recipe.name} from saved recipes?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeRecipe(recipe.id),
      },
    ]);
  };

  return (
    <Screen
      title="Recipes"
      subtitle="Save simple recipes locally so the app can compare them against the ingredients you already have.">
      <View style={styles.actionsRow}>
        <AppButton label="Add recipe" onPress={() => router.push('/recipes/recipe-form')} />
        <AppButton
          label="Open suggestions"
          onPress={() => router.push('/suggestions')}
          variant="secondary"
        />
      </View>

      {sortedRecipes.length ? (
        <View style={styles.listGroup}>
          {sortedRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              onDelete={() => handleDelete(recipe)}
              onEdit={() =>
                router.push({
                  pathname: '/recipes/recipe-form',
                  params: { id: recipe.id },
                })
              }
              recipe={recipe}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          description="Create a few core meals you already like cooking. Suggestions will stay local and work entirely from your saved data."
          title="No recipes saved yet"
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

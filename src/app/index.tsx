import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { RecipeCard } from '@/components/recipe-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';
import { palette, spacing } from '@/constants/theme';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useRecipeStore } from '@/store/useRecipeStore';
import { isExpiringSoon } from '@/utils/date';
import { buildRecipeSuggestions } from '@/utils/suggestionEngine';

export default function HomeScreen() {
  const router = useRouter();
  const ingredients = useInventoryStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);

  const suggestions = buildRecipeSuggestions(ingredients, recipes);
  const readySuggestions = suggestions.filter((item) => item.status === 'ready').slice(0, 2);
  const expiringSoonItems = useMemo(
    () => ingredients.filter((item) => isExpiringSoon(item.expiresAt, 3)).slice(0, 3),
    [ingredients]
  );

  return (
    <Screen
      title="Meal from Fridge"
      subtitle="Keep a simple fridge inventory, save recipes you actually cook, and get quick suggestions from what is already on hand.">
      <View style={styles.statGrid}>
        <StatCard
          helper="Currently tracked"
          label="Ingredients"
          value={String(ingredients.length)}
        />
        <StatCard helper="Saved locally" label="Recipes" value={String(recipes.length)} />
        <StatCard
          helper="Cookable right now"
          label="Ready meals"
          value={String(readySuggestions.length)}
        />
        <StatCard
          helper="Use these first"
          label="Expiring soon"
          value={String(expiringSoonItems.length)}
        />
      </View>

      <SectionCard
        title="Quick actions"
        subtitle="Jump straight into the MVP flow: update ingredients, save recipes, and check what you can make.">
        <View style={styles.buttonGrid}>
          <AppButton
            label="View inventory"
            onPress={() => router.push('/inventory')}
            style={styles.actionButton}
          />
          <AppButton
            label="Add ingredient"
            onPress={() => router.push('/inventory/ingredient-form')}
            style={styles.actionButton}
            variant="secondary"
          />
          <AppButton
            label="View recipes"
            onPress={() => router.push('/recipes')}
            style={styles.actionButton}
            variant="secondary"
          />
          <AppButton
            label="See suggestions"
            onPress={() => router.push('/suggestions')}
            style={styles.actionButton}
          />
        </View>
      </SectionCard>

      <SectionCard title="Use first" subtitle="A quick reminder of ingredients that are close to expiring.">
        {expiringSoonItems.length ? (
          <View style={styles.listGroup}>
            {expiringSoonItems.map((item) => (
              <View key={item.id} style={styles.previewRow}>
                <Text style={styles.previewTitle}>{item.name}</Text>
                <Text style={styles.previewMeta}>
                  {item.quantity} {item.unit}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            description="Add ingredients with an expiry date and this section will surface the ones you should use soon."
            title="Nothing urgent yet"
          />
        )}
      </SectionCard>

      <SectionCard
        title="Ready to cook"
        subtitle="Once inventory and recipes are filled in, this section highlights the easiest wins.">
        {readySuggestions.length ? (
          <View style={styles.listGroup}>
            {readySuggestions.map((suggestion) => (
              <RecipeCard
                key={suggestion.recipe.id}
                footer={
                  <Text style={styles.recipeFooter}>
                    {suggestion.expiringSoonCount
                      ? `Great pick to use ${suggestion.expiringSoonCount} soon-to-expire ingredient${suggestion.expiringSoonCount === 1 ? '' : 's'}.`
                      : 'All required ingredients are already in your inventory.'}
                  </Text>
                }
                recipe={suggestion.recipe}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            description="Start by adding a few ingredients and at least one recipe. The suggestion engine will do the rest locally."
            title="No ready recipes yet"
          />
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  listGroup: {
    gap: spacing.md,
  },
  previewRow: {
    borderRadius: 14,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  previewTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  previewMeta: {
    color: palette.textMuted,
    fontSize: 13,
  },
  recipeFooter: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});

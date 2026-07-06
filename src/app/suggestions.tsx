import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { RecipeCard } from '@/components/recipe-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette, spacing } from '@/constants/theme';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useRecipeStore } from '@/store/useRecipeStore';
import type { RecipeSuggestion, SuggestionStatus } from '@/utils/suggestionEngine';
import { buildRecipeSuggestions } from '@/utils/suggestionEngine';

function renderSuggestionSummary(suggestion: RecipeSuggestion) {
  const missingNames = suggestion.missingIngredients.map((item) => item.ingredientName).join(', ');

  return (
    <View style={styles.suggestionSummary}>
      <Text style={styles.summaryText}>
        {Math.round(suggestion.matchPercentage * 100)}% matched from current inventory.
      </Text>
      {missingNames ? <Text style={styles.summaryText}>Missing: {missingNames}.</Text> : null}
      {suggestion.expiringSoonCount ? (
        <Text style={styles.summaryText}>
          Uses {suggestion.expiringSoonCount} ingredient
          {suggestion.expiringSoonCount === 1 ? '' : 's'} that should be used soon.
        </Text>
      ) : null}
    </View>
  );
}

function getSectionMeta(status: SuggestionStatus) {
  if (status === 'ready') {
    return {
      title: 'Ready now',
      subtitle: 'These recipes can be cooked immediately from the ingredients you already have.',
    };
  }
  if (status === 'almost') {
    return {
      title: 'Almost there',
      subtitle: 'Close matches that need only one ingredient or a small top-up.',
    };
  }

  return {
    title: 'Plan ahead',
    subtitle: 'Worth keeping around for later once your inventory grows.',
  };
}

export default function SuggestionsScreen() {
  const ingredients = useInventoryStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);

  const suggestions = buildRecipeSuggestions(ingredients, recipes);
  const ready = suggestions.filter((item) => item.status === 'ready');
  const almost = suggestions.filter((item) => item.status === 'almost');
  const future = suggestions.filter((item) => item.status === 'future');

  if (!recipes.length) {
    return (
      <Screen
        title="Suggestions"
        subtitle="Recipe suggestions are generated locally by comparing your saved recipes against your current inventory.">
        <EmptyState
          description="Add at least one recipe first, then this screen can rank what is ready, almost ready, or better for later."
          title="No recipes to compare yet"
        />
      </Screen>
    );
  }

  if (!ingredients.length) {
    return (
      <Screen
        title="Suggestions"
        subtitle="Recipe suggestions are generated locally by comparing your saved recipes against your current inventory.">
        <EmptyState
          description="Add ingredients to your inventory so the suggestion engine can start matching them against recipes."
          title="Inventory needed for suggestions"
        />
      </Screen>
    );
  }

  const sections = [
    { status: 'ready' as const, items: ready },
    { status: 'almost' as const, items: almost },
    { status: 'future' as const, items: future },
  ].filter((section) => section.items.length > 0);

  return (
    <Screen
      title="Suggestions"
      subtitle="A lightweight local engine groups recipes by how well they match what is already in your fridge.">
      <View style={styles.listGroup}>
        {sections.map((section) => {
          const meta = getSectionMeta(section.status);
          return (
            <SectionCard key={section.status} subtitle={meta.subtitle} title={meta.title}>
              <View style={styles.listGroup}>
                {section.items.map((suggestion) => (
                  <RecipeCard
                    footer={renderSuggestionSummary(suggestion)}
                    key={suggestion.recipe.id}
                    recipe={suggestion.recipe}
                  />
                ))}
              </View>
            </SectionCard>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listGroup: {
    gap: spacing.md,
  },
  suggestionSummary: {
    gap: spacing.xs,
  },
  summaryText: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});

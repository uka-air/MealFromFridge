import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ChipSelect, type SelectOption } from '@/components/chip-select';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { IngredientCard } from '@/components/ingredient-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette, spacing } from '@/constants/theme';
import { useInventoryStore } from '@/store/useInventoryStore';
import {
  INGREDIENT_CATEGORIES,
  type Ingredient,
  type IngredientCategory,
} from '@/types/ingredient';

type IngredientCategoryFilter = IngredientCategory | 'all';

const categoryOptions: SelectOption<IngredientCategoryFilter>[] = [
  {
    label: 'All',
    value: 'all',
  },
  ...INGREDIENT_CATEGORIES.map((value) => ({
    label: value.charAt(0).toUpperCase() + value.slice(1),
    value,
  })),
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function InventoryScreen() {
  const router = useRouter();
  const ingredients = useInventoryStore((state) => state.ingredients);
  const deleteIngredient = useInventoryStore((state) => state.deleteIngredient);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IngredientCategoryFilter>('all');

  const filteredIngredients = useMemo(() => {
    const normalizedSearchQuery = normalize(searchQuery);

    return ingredients.filter((ingredient) => {
      const matchesSearch =
        !normalizedSearchQuery || normalize(ingredient.name).includes(normalizedSearchQuery);
      const matchesCategory =
        categoryFilter === 'all' || ingredient.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, ingredients, searchQuery]);

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
      subtitle="Track what you have, find it fast, and spot what needs to be used soon.">
      <View style={styles.actionsRow}>
        <AppButton label="Add ingredient" onPress={() => router.push('/inventory/ingredient-form')} />
        <AppButton
          label="View suggestions"
          onPress={() => router.push('/suggestions')}
          variant="secondary"
        />
      </View>

      <SectionCard
        title="Find ingredients"
        subtitle="Search by name and narrow the list by category.">
        <FormField
          autoCapitalize="none"
          label="Search"
          onChangeText={setSearchQuery}
          placeholder="Search eggs, spinach, milk..."
          value={searchQuery}
        />
        <ChipSelect
          label="Category"
          onChange={setCategoryFilter}
          options={categoryOptions}
          value={categoryFilter}
        />
        <Text style={styles.resultCount}>
          {filteredIngredients.length} of {ingredients.length} ingredient
          {ingredients.length === 1 ? '' : 's'}
        </Text>
        {!!filteredIngredients.length && (
          <Text style={styles.helperText}>Tap any ingredient card to edit it.</Text>
        )}
      </SectionCard>

      {ingredients.length ? (
        filteredIngredients.length ? (
          <View style={styles.listGroup}>
            {filteredIngredients.map((ingredient) => (
              <IngredientCard
                ingredient={ingredient}
                key={ingredient.id}
                onDelete={() => handleDelete(ingredient)}
                onPress={() =>
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
            description="Try a different search term or switch the category filter to see more ingredients."
            title="No matching ingredients"
          />
        )
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
  resultCount: {
    color: palette.textMuted,
    fontSize: 13,
  },
  helperText: {
    color: palette.textMuted,
    fontSize: 13,
  },
});

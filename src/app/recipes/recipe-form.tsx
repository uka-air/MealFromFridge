import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ChipSelect, type SelectOption } from '@/components/chip-select';
import { FavoriteButton } from '@/components/favorite-button';
import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { ToggleChip } from '@/components/toggle-chip';
import { palette, radius, spacing } from '@/constants/theme';
import { useRecipeStore } from '@/store/useRecipeStore';
import { INGREDIENT_UNITS, type IngredientUnit } from '@/types/ingredient';
import { createId } from '@/utils/id';

interface IngredientLine {
  id: string;
  name: string;
  quantity: string;
  unit: IngredientUnit;
  optional: boolean;
  matchAnyOf?: string[];
}

const unitOptions: SelectOption<IngredientUnit>[] = INGREDIENT_UNITS.map((value) => ({
  label: value.toUpperCase(),
  value,
}));

function createIngredientLine(): IngredientLine {
  return {
    id: createId('draft-ingredient'),
    name: '',
    quantity: '',
    unit: 'item',
    optional: false,
  };
}

export default function RecipeFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const recipeId = typeof params.id === 'string' ? params.id : undefined;

  const recipes = useRecipeStore((state) => state.recipes);
  const addRecipe = useRecipeStore((state) => state.addRecipe);
  const updateRecipe = useRecipeStore((state) => state.updateRecipe);
  const removeRecipe = useRecipeStore((state) => state.removeRecipe);

  const existingRecipe = recipes.find((recipe) => recipe.id === recipeId);

  const [name, setName] = useState('');
  const [cookMinutes, setCookMinutes] = useState('15');
  const [tagsText, setTagsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [ingredientLines, setIngredientLines] = useState<IngredientLine[]>([createIngredientLine()]);

  useEffect(() => {
    if (!existingRecipe) {
      setName('');
      setCookMinutes('15');
      setTagsText('');
      setStepsText('');
      setIsFavorite(false);
      setIngredientLines([createIngredientLine()]);
      return;
    }

    setName(existingRecipe.name);
    setCookMinutes(String(existingRecipe.cookMinutes));
    setTagsText(existingRecipe.tags.join(', '));
    setStepsText(existingRecipe.instructions.join('\n'));
    setIsFavorite(existingRecipe.isFavorite);
    setIngredientLines(
      existingRecipe.ingredients.length
        ? existingRecipe.ingredients.map((ingredient) => ({
            id: ingredient.id,
            name: ingredient.ingredientName,
            quantity: ingredient.quantity ? String(ingredient.quantity) : '',
            unit: ingredient.unit ?? 'item',
            optional: !!ingredient.optional,
            matchAnyOf: ingredient.matchAnyOf ? [...ingredient.matchAnyOf] : undefined,
          }))
        : [createIngredientLine()]
    );
  }, [existingRecipe]);

  const updateIngredientLine = (id: string, updates: Partial<IngredientLine>) => {
    setIngredientLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...updates } : line))
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing recipe name', 'Please enter a recipe name.');
      return;
    }

    const parsedCookMinutes = Number(cookMinutes);
    if (!Number.isFinite(parsedCookMinutes) || parsedCookMinutes < 0) {
      Alert.alert('Invalid cook time', 'Cook time should be a valid number that is zero or more.');
      return;
    }

    let hasInvalidIngredientQuantity = false;

    const ingredients = ingredientLines.reduce<
      {
        ingredientName: string;
        quantity?: number;
        unit?: IngredientUnit;
        optional?: boolean;
        matchAnyOf?: string[];
      }[]
    >((accumulator, line) => {
      const ingredientName = line.name.trim();
      if (!ingredientName) {
        return accumulator;
      }

      const quantityValue = line.quantity.trim();
      let parsedQuantity: number | undefined;
      if (quantityValue) {
        parsedQuantity = Number(quantityValue);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
          hasInvalidIngredientQuantity = true;
          return accumulator;
        }
      }

      accumulator.push({
        ingredientName,
        quantity: parsedQuantity,
        unit: line.unit,
        optional: line.optional || undefined,
        matchAnyOf: line.matchAnyOf ? [...line.matchAnyOf] : undefined,
      });

      return accumulator;
    }, []);

    if (hasInvalidIngredientQuantity) {
      Alert.alert(
        'Invalid ingredient quantity',
        'Ingredient quantities should be numbers greater than zero.'
      );
      return;
    }

    if (!ingredients.length) {
      Alert.alert('Missing ingredients', 'Add at least one ingredient line for the recipe.');
      return;
    }

    const steps = stepsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!steps.length) {
      Alert.alert('Missing steps', 'Please add at least one cooking step.');
      return;
    }

    const draft = {
      name: name.trim(),
      isFavorite,
      description: existingRecipe?.description ?? '',
      prepMinutes: existingRecipe?.prepMinutes ?? 0,
      cookMinutes: parsedCookMinutes,
      servings: existingRecipe?.servings ?? 1,
      ingredients,
      instructions: steps,
      tags: tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      notes: existingRecipe?.notes,
    };

    if (recipeId && existingRecipe) {
      updateRecipe(recipeId, draft);
    } else {
      addRecipe(draft);
    }

    router.back();
  };

  const handleDelete = () => {
    if (!recipeId || !existingRecipe) {
      return;
    }

    Alert.alert('Delete recipe?', `Remove ${existingRecipe.name} from saved recipes?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeRecipe(recipeId);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen
      title={existingRecipe ? 'Edit recipe' : 'Add recipe'}
      subtitle="Keep each recipe lightweight but clear enough to save and reuse.">
      <SectionCard title="Recipe details">
        <FormField
          autoCapitalize="words"
          label="Recipe name"
          onChangeText={setName}
          placeholder="Thai basil chicken"
          value={name}
        />
        <FormField
          keyboardType="number-pad"
          label="Cook time (minutes)"
          onChangeText={setCookMinutes}
          placeholder="15"
          value={cookMinutes}
        />
        <FormField
          autoCapitalize="none"
          label="Tags"
          onChangeText={setTagsText}
          placeholder="quick, spicy, dinner"
          value={tagsText}
        />
        <Text style={styles.helperText}>Separate tags with commas.</Text>
        <FavoriteButton label="Favorite" onChange={setIsFavorite} value={isFavorite} />
      </SectionCard>

      <SectionCard
        title="Ingredients"
        subtitle="Add the main ingredients you need. Optional items will not block suggestions.">
        <View style={styles.listGroup}>
          {ingredientLines.map((line, index) => (
            <View key={line.id} style={styles.embeddedCard}>
              <FormField
                autoCapitalize="words"
                label={`Ingredient ${index + 1}`}
                onChangeText={(value) =>
                  updateIngredientLine(line.id, {
                    name: value,
                    matchAnyOf: undefined,
                  })
                }
                placeholder="Chicken breast"
                value={line.name}
              />

              <View style={styles.inlineFields}>
                <View style={styles.inlineField}>
                  <FormField
                    keyboardType="decimal-pad"
                    label="Quantity"
                    onChangeText={(value) => updateIngredientLine(line.id, { quantity: value })}
                    placeholder="1"
                    value={line.quantity}
                  />
                </View>
                <View style={styles.inlineField}>
                  <ChipSelect
                    label="Unit"
                    onChange={(value) => updateIngredientLine(line.id, { unit: value })}
                    options={unitOptions}
                    value={line.unit}
                  />
                </View>
              </View>

              <ToggleChip
                activeLabel="Optional"
                inactiveLabel="Required"
                label="Ingredient type"
                onChange={(value) => updateIngredientLine(line.id, { optional: value })}
                value={line.optional}
              />

              {ingredientLines.length > 1 ? (
                <AppButton
                  label="Remove line"
                  onPress={() =>
                    setIngredientLines((current) => current.filter((item) => item.id !== line.id))
                  }
                  variant="ghost"
                />
              ) : null}
            </View>
          ))}
        </View>

        <AppButton
          label="Add ingredient line"
          onPress={() => setIngredientLines((current) => [...current, createIngredientLine()])}
          variant="secondary"
        />
      </SectionCard>

      <SectionCard
        title="Steps"
        subtitle="Write one step per line so the recipe stays easy to scan later.">
        <FormField
          label="Cooking steps"
          multiline
          onChangeText={setStepsText}
          placeholder={'1. Prep the ingredients\n2. Heat the pan\n3. Cook and season'}
          value={stepsText}
        />
      </SectionCard>

      <View style={styles.actionsStack}>
        <AppButton label={existingRecipe ? 'Save changes' : 'Save recipe'} onPress={handleSave} />
        {existingRecipe ? (
          <AppButton label="Delete recipe" onPress={handleDelete} variant="danger" />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inlineFields: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inlineField: {
    flex: 1,
  },
  listGroup: {
    gap: spacing.md,
  },
  embeddedCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.md,
    gap: spacing.md,
  },
  helperText: {
    marginTop: -spacing.md,
    color: palette.textMuted,
    fontSize: 13,
  },
  actionsStack: {
    gap: spacing.sm,
  },
});

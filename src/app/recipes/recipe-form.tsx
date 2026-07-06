import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ChipSelect, type SelectOption } from '@/components/chip-select';
import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette, radius, spacing } from '@/constants/theme';
import { useRecipeStore } from '@/store/useRecipeStore';
import { INGREDIENT_UNITS, type IngredientUnit } from '@/types/ingredient';
import { createId } from '@/utils/id';

interface IngredientLine {
  id: string;
  name: string;
  quantity: string;
  unit: IngredientUnit;
}

interface InstructionLine {
  id: string;
  value: string;
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
  };
}

function createInstructionLine(value = ''): InstructionLine {
  return {
    id: createId('draft-step'),
    value,
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
  const [description, setDescription] = useState('');
  const [prepMinutes, setPrepMinutes] = useState('10');
  const [cookMinutes, setCookMinutes] = useState('15');
  const [servings, setServings] = useState('2');
  const [tagsText, setTagsText] = useState('');
  const [notes, setNotes] = useState('');
  const [ingredientLines, setIngredientLines] = useState<IngredientLine[]>([createIngredientLine()]);
  const [instructionLines, setInstructionLines] = useState<InstructionLine[]>([
    createInstructionLine(),
  ]);

  useEffect(() => {
    if (!existingRecipe) {
      return;
    }

    setName(existingRecipe.name);
    setDescription(existingRecipe.description);
    setPrepMinutes(String(existingRecipe.prepMinutes));
    setCookMinutes(String(existingRecipe.cookMinutes));
    setServings(String(existingRecipe.servings));
    setTagsText(existingRecipe.tags.join(', '));
    setNotes(existingRecipe.notes ?? '');
    setIngredientLines(
      existingRecipe.ingredients.length
        ? existingRecipe.ingredients.map((ingredient) => ({
            id: ingredient.id,
            name: ingredient.ingredientName,
            quantity: ingredient.quantity ? String(ingredient.quantity) : '',
            unit: ingredient.unit ?? 'item',
          }))
        : [createIngredientLine()]
    );
    setInstructionLines(
      existingRecipe.instructions.length
        ? existingRecipe.instructions.map((instruction) => createInstructionLine(instruction))
        : [createInstructionLine()]
    );
  }, [existingRecipe]);

  const updateIngredientLine = (id: string, updates: Partial<IngredientLine>) => {
    setIngredientLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...updates } : line))
    );
  };

  const updateInstructionLine = (id: string, value: string) => {
    setInstructionLines((current) =>
      current.map((line) => (line.id === id ? { ...line, value } : line))
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing recipe name', 'Please enter a recipe name.');
      return;
    }

    const parsedPrepMinutes = Number(prepMinutes);
    const parsedCookMinutes = Number(cookMinutes);
    const parsedServings = Number(servings);

    if (
      !Number.isFinite(parsedPrepMinutes) ||
      !Number.isFinite(parsedCookMinutes) ||
      !Number.isFinite(parsedServings) ||
      parsedPrepMinutes < 0 ||
      parsedCookMinutes < 0 ||
      parsedServings <= 0
    ) {
      Alert.alert(
        'Invalid numbers',
        'Prep time, cook time, and servings need valid numbers. Servings should be greater than zero.'
      );
      return;
    }

    let hasInvalidIngredientQuantity = false;

    const ingredients = ingredientLines.reduce<
      {
        ingredientName: string;
        quantity?: number;
        unit?: IngredientUnit;
        optional?: boolean;
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
      });

      return accumulator;
    }, []);

    if (hasInvalidIngredientQuantity) {
      Alert.alert('Invalid ingredient quantity', 'Ingredient quantities should be numbers greater than zero.');
      return;
    }

    if (!ingredients.length) {
      Alert.alert('Missing ingredients', 'Add at least one ingredient line for the recipe.');
      return;
    }

    const instructions = instructionLines
      .map((line) => line.value.trim())
      .filter((instruction) => instruction.length > 0);

    if (!instructions.length) {
      Alert.alert('Missing steps', 'Add at least one instruction step.');
      return;
    }

    const draft = {
      name: name.trim(),
      description: description.trim(),
      prepMinutes: parsedPrepMinutes,
      cookMinutes: parsedCookMinutes,
      servings: parsedServings,
      ingredients,
      instructions,
      tags: tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      notes: notes.trim() || undefined,
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
      subtitle="Store the basics only for now: ingredients, steps, timing, servings, and a few lightweight tags.">
      <SectionCard title="Recipe basics">
        <FormField
          autoCapitalize="words"
          label="Name"
          onChangeText={setName}
          placeholder="Veggie fried rice"
          value={name}
        />
        <FormField
          label="Description"
          multiline
          onChangeText={setDescription}
          placeholder="A fast weeknight dinner that uses leftover rice and vegetables."
          value={description}
        />

        <View style={styles.inlineFields}>
          <View style={styles.inlineField}>
            <FormField
              keyboardType="number-pad"
              label="Prep minutes"
              onChangeText={setPrepMinutes}
              placeholder="10"
              value={prepMinutes}
            />
          </View>
          <View style={styles.inlineField}>
            <FormField
              keyboardType="number-pad"
              label="Cook minutes"
              onChangeText={setCookMinutes}
              placeholder="15"
              value={cookMinutes}
            />
          </View>
          <View style={styles.inlineField}>
            <FormField
              keyboardType="number-pad"
              label="Servings"
              onChangeText={setServings}
              placeholder="2"
              value={servings}
            />
          </View>
        </View>

        <FormField
          autoCapitalize="none"
          label="Tags"
          onChangeText={setTagsText}
          placeholder="quick, vegetarian, dinner"
          value={tagsText}
        />
        <FormField
          label="Notes"
          multiline
          onChangeText={setNotes}
          placeholder="Optional notes like substitutions or serving ideas."
          value={notes}
        />
      </SectionCard>

      <SectionCard title="Ingredients" subtitle="Add each required ingredient as its own row.">
        <View style={styles.listGroup}>
          {ingredientLines.map((line, index) => (
            <View key={line.id} style={styles.embeddedCard}>
              <FormField
                autoCapitalize="words"
                label={`Ingredient ${index + 1}`}
                onChangeText={(value) => updateIngredientLine(line.id, { name: value })}
                placeholder="Cooked rice"
                value={line.name}
              />
              <View style={styles.inlineFields}>
                <View style={styles.inlineField}>
                  <FormField
                    keyboardType="decimal-pad"
                    label="Quantity"
                    onChangeText={(value) => updateIngredientLine(line.id, { quantity: value })}
                    placeholder="2"
                    value={line.quantity}
                  />
                </View>
              </View>
              <ChipSelect
                label="Unit"
                onChange={(value) => updateIngredientLine(line.id, { unit: value })}
                options={unitOptions}
                value={line.unit}
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

      <SectionCard title="Instructions" subtitle="Break the recipe into short, easy-to-follow steps.">
        <View style={styles.listGroup}>
          {instructionLines.map((line, index) => (
            <View key={line.id} style={styles.embeddedCard}>
              <Text style={styles.stepLabel}>Step {index + 1}</Text>
              <FormField
                label="Instruction"
                multiline
                onChangeText={(value) => updateInstructionLine(line.id, value)}
                placeholder="Heat the pan and saute the aromatics."
                value={line.value}
              />
              {instructionLines.length > 1 ? (
                <AppButton
                  label="Remove step"
                  onPress={() =>
                    setInstructionLines((current) => current.filter((item) => item.id !== line.id))
                  }
                  variant="ghost"
                />
              ) : null}
            </View>
          ))}
        </View>

        <AppButton
          label="Add instruction step"
          onPress={() => setInstructionLines((current) => [...current, createInstructionLine()])}
          variant="secondary"
        />
      </SectionCard>

      <View style={styles.actionsStack}>
        <AppButton label={existingRecipe ? 'Save changes' : 'Add recipe'} onPress={handleSave} />
        {existingRecipe ? <AppButton label="Delete recipe" onPress={handleDelete} variant="danger" /> : null}
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
  stepLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  actionsStack: {
    gap: spacing.sm,
  },
});

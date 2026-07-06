import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ChipSelect, type SelectOption } from '@/components/chip-select';
import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { spacing } from '@/constants/theme';
import { useInventoryStore } from '@/store/useInventoryStore';
import {
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
  type IngredientCategory,
  type IngredientUnit,
} from '@/types/ingredient';
import {
  getTodayDateInputValue,
  isValidDateInput,
  toDateInputValue,
} from '@/utils/date';

const unitOptions: SelectOption<IngredientUnit>[] = INGREDIENT_UNITS.map((value) => ({
  label: value.toUpperCase(),
  value,
}));

const categoryOptions: SelectOption<IngredientCategory>[] = INGREDIENT_CATEGORIES.map((value) => ({
  label: value.charAt(0).toUpperCase() + value.slice(1),
  value,
}));

export default function IngredientFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const ingredientId = typeof params.id === 'string' ? params.id : undefined;

  const ingredients = useInventoryStore((state) => state.ingredients);
  const addIngredient = useInventoryStore((state) => state.addIngredient);
  const updateIngredient = useInventoryStore((state) => state.updateIngredient);
  const deleteIngredient = useInventoryStore((state) => state.deleteIngredient);

  const existingIngredient = ingredients.find((item) => item.id === ingredientId);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<IngredientUnit>('item');
  const [category, setCategory] = useState<IngredientCategory>('produce');
  const [purchasedAt, setPurchasedAt] = useState(getTodayDateInputValue());
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!existingIngredient) {
      setName('');
      setQuantity('1');
      setUnit('item');
      setCategory('produce');
      setPurchasedAt(getTodayDateInputValue());
      setExpiresAt('');
      setNote('');
      return;
    }

    setName(existingIngredient.name);
    setQuantity(String(existingIngredient.quantity));
    setUnit(existingIngredient.unit);
    setCategory(existingIngredient.category);
    setPurchasedAt(toDateInputValue(existingIngredient.purchasedAt) || getTodayDateInputValue());
    setExpiresAt(toDateInputValue(existingIngredient.expiresAt));
    setNote(existingIngredient.note ?? '');
  }, [existingIngredient]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter an ingredient name.');
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Invalid quantity', 'Quantity should be a number greater than zero.');
      return;
    }

    const purchasedAtValue = purchasedAt.trim();
    if (!purchasedAtValue) {
      Alert.alert('Missing purchase date', 'Please enter when you bought this ingredient.');
      return;
    }
    if (!isValidDateInput(purchasedAtValue)) {
      Alert.alert('Invalid purchase date', 'Please use the format YYYY-MM-DD for the purchase date.');
      return;
    }

    const expiryValue = expiresAt.trim();
    if (expiryValue && !isValidDateInput(expiryValue)) {
      Alert.alert('Invalid date', 'Please use the format YYYY-MM-DD for expiry dates.');
      return;
    }
    if (expiryValue && purchasedAtValue > expiryValue) {
      Alert.alert(
        'Invalid expiry date',
        'Expiry date should be the same as or later than the purchase date.'
      );
      return;
    }

    const draft = {
      name: name.trim(),
      quantity: parsedQuantity,
      unit,
      category,
      purchasedAt: purchasedAtValue,
      expiresAt: expiryValue || null,
      note: note.trim() || null,
    };

    if (ingredientId && existingIngredient) {
      updateIngredient(ingredientId, draft);
    } else {
      addIngredient(draft);
    }

    router.back();
  };

  const handleDelete = () => {
    if (!ingredientId || !existingIngredient) {
      return;
    }

    Alert.alert('Delete ingredient?', `Remove ${existingIngredient.name} from inventory?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteIngredient(ingredientId);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen
      title={existingIngredient ? 'Edit ingredient' : 'Add ingredient'}
      subtitle="Capture the basics so inventory stays accurate and suggestions stay useful.">
      <SectionCard title="Ingredient details">
        <FormField
          autoCapitalize="words"
          label="Name"
          onChangeText={setName}
          placeholder="Eggs, spinach, parmesan"
          value={name}
        />

        <ChipSelect
          label="Category"
          onChange={setCategory}
          options={categoryOptions}
          value={category}
        />
        <FormField
          keyboardType="decimal-pad"
          label="Quantity"
          onChangeText={setQuantity}
          placeholder="1"
          value={quantity}
        />
        <ChipSelect label="Unit" onChange={setUnit} options={unitOptions} value={unit} />
        <View style={styles.inlineFields}>
          <View style={styles.inlineField}>
            <FormField
              autoCapitalize="none"
              label="Purchased at"
              onChangeText={setPurchasedAt}
              placeholder="YYYY-MM-DD"
              value={purchasedAt}
            />
          </View>
          <View style={styles.inlineField}>
            <FormField
              autoCapitalize="none"
              label="Expires at"
              onChangeText={setExpiresAt}
              placeholder="YYYY-MM-DD"
              value={expiresAt}
            />
          </View>
        </View>

        <FormField
          label="Note"
          multiline
          onChangeText={setNote}
          placeholder="Optional details like brand, location, or prep notes."
          value={note}
        />
      </SectionCard>

      <View style={styles.actionsStack}>
        <AppButton label={existingIngredient ? 'Save changes' : 'Add ingredient'} onPress={handleSave} />
        {existingIngredient ? (
          <AppButton label="Delete ingredient" onPress={handleDelete} variant="danger" />
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
  actionsStack: {
    gap: spacing.sm,
  },
});

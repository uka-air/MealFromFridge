import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ChipSelect, type SelectOption } from '@/components/chip-select';
import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette, spacing } from '@/constants/theme';
import { useInventoryStore } from '@/store/useInventoryStore';
import {
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
  type IngredientCategory,
  type IngredientSource,
  type IngredientUnit,
} from '@/types/ingredient';
import {
  addDaysToDateInputValue,
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

function isIngredientCategory(value: string): value is IngredientCategory {
  return INGREDIENT_CATEGORIES.includes(value as IngredientCategory);
}

function isIngredientUnit(value: string): value is IngredientUnit {
  return INGREDIENT_UNITS.includes(value as IngredientUnit);
}

export default function IngredientFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    barcode?: string;
    productName?: string;
    productCategory?: string;
    productUnit?: string;
    productBrand?: string;
    productShelfLifeDays?: string;
    source?: string;
  }>();
  const ingredientId = typeof params.id === 'string' ? params.id : undefined;
  const scannedBarcode = typeof params.barcode === 'string' ? params.barcode : '';
  const scannedProductName =
    typeof params.productName === 'string' ? params.productName : '';
  const scannedProductBrand =
    typeof params.productBrand === 'string' ? params.productBrand : '';
  const scannedSource: IngredientSource =
    params.source === 'barcode' || !!scannedBarcode ? 'barcode' : 'manual';
  const scannedCategory =
    typeof params.productCategory === 'string' &&
    isIngredientCategory(params.productCategory)
      ? params.productCategory
      : undefined;
  const scannedUnit =
    typeof params.productUnit === 'string' && isIngredientUnit(params.productUnit)
      ? params.productUnit
      : undefined;
  const scannedShelfLifeDays =
    typeof params.productShelfLifeDays === 'string'
      ? Number(params.productShelfLifeDays)
      : Number.NaN;

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
  const [barcode, setBarcode] = useState('');
  const [brand, setBrand] = useState('');
  const [source, setSource] = useState<IngredientSource>('manual');

  useEffect(() => {
    if (!existingIngredient) {
      const suggestedExpiry =
        Number.isFinite(scannedShelfLifeDays) && scannedShelfLifeDays >= 0
          ? addDaysToDateInputValue(scannedShelfLifeDays)
          : '';

      setName('');
      setQuantity('1');
      setUnit(scannedUnit ?? 'item');
      setCategory(scannedCategory ?? 'other');
      setPurchasedAt(getTodayDateInputValue());
      setExpiresAt(suggestedExpiry);
      setNote('');
      setBarcode(scannedBarcode);
      setBrand(scannedProductBrand);
      setSource(scannedSource);

      if (scannedProductName) {
        setName(scannedProductName);
      }

      return;
    }

    setName(existingIngredient.name);
    setQuantity(String(existingIngredient.quantity));
    setUnit(existingIngredient.unit);
    setCategory(existingIngredient.category);
    setPurchasedAt(toDateInputValue(existingIngredient.purchasedAt) || getTodayDateInputValue());
    setExpiresAt(toDateInputValue(existingIngredient.expiresAt));
    setNote(existingIngredient.note ?? '');
    setBarcode(existingIngredient.barcode ?? '');
    setBrand(existingIngredient.brand ?? '');
    setSource(existingIngredient.source ?? 'manual');
  }, [
    existingIngredient,
    scannedBarcode,
    scannedCategory,
    scannedProductBrand,
    scannedProductName,
    scannedShelfLifeDays,
    scannedSource,
    scannedUnit,
  ]);

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
      barcode: barcode.trim() || undefined,
      brand: brand.trim() || undefined,
      source: barcode.trim() ? source : 'manual',
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
        {source === 'barcode' ? (
          <Text style={styles.sourceNote}>
            Prefilled from barcode scan. You can still edit the details before saving.
          </Text>
        ) : null}
        <FormField
          autoCapitalize="words"
          label="Name"
          onChangeText={setName}
          placeholder="Eggs, spinach, parmesan"
          value={name}
        />
        <FormField
          autoCapitalize="none"
          keyboardType="number-pad"
          label="Barcode"
          onChangeText={setBarcode}
          placeholder="8850000000002"
          value={barcode}
        />
        <FormField
          autoCapitalize="words"
          label="Brand"
          onChangeText={setBrand}
          placeholder="Optional brand"
          value={brand}
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
  sourceNote: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
});

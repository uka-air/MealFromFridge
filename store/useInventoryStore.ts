import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
  type Ingredient,
  type IngredientCategory,
  type IngredientDraft,
  type IngredientUnit,
  type IngredientUpdate,
} from '@/types/ingredient';
import { createId } from '@/utils/id';
import { daysUntilExpiry, isExpired, isExpiringSoon } from '@/utils/date';

const INVENTORY_STORAGE_KEY = 'meal-from-fridge-inventory';
const INVENTORY_STORE_VERSION = 2;
const DEFAULT_CATEGORY: IngredientCategory = 'other';
const DEFAULT_UNIT: IngredientUnit = 'item';

interface InventoryState {
  ingredients: Ingredient[];
  addIngredient: (draft: IngredientDraft) => Ingredient;
  updateIngredient: (id: string, updates: IngredientUpdate) => Ingredient | null;
  deleteIngredient: (id: string) => void;
  getAllIngredients: () => Ingredient[];
  getExpiringIngredients: (days?: number) => Ingredient[];
  getExpiredIngredients: () => Ingredient[];
  clearInventory: () => void;
}

type InventoryPersistedState = Pick<InventoryState, 'ingredients'>;

interface LegacyIngredientRecord {
  id?: unknown;
  name?: unknown;
  category?: unknown;
  quantity?: unknown;
  unit?: unknown;
  purchasedAt?: unknown;
  expiresAt?: unknown;
  note?: unknown;
  notes?: unknown;
  createdAt?: unknown;
}

function isIngredientCategory(value: string): value is IngredientCategory {
  return INGREDIENT_CATEGORIES.includes(value as IngredientCategory);
}

function isIngredientUnit(value: string): value is IngredientUnit {
  return INGREDIENT_UNITS.includes(value as IngredientUnit);
}

function normalizeRequiredName(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error('Ingredient name is required.');
  }

  return trimmedValue;
}

function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Ingredient quantity must be greater than zero.');
  }

  return quantity;
}

function normalizeOptionalText(value?: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

function normalizePurchasedAt(value?: string) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : new Date().toISOString();
}

function normalizeIngredientDraft(draft: IngredientDraft): Omit<Ingredient, 'id'> {
  return {
    name: normalizeRequiredName(draft.name),
    category: draft.category,
    quantity: normalizeQuantity(draft.quantity),
    unit: draft.unit,
    purchasedAt: normalizePurchasedAt(draft.purchasedAt),
    expiresAt: normalizeOptionalText(draft.expiresAt),
    note: normalizeOptionalText(draft.note),
  };
}

function applyIngredientUpdates(ingredient: Ingredient, updates: IngredientUpdate): Ingredient {
  return {
    id: ingredient.id,
    name:
      updates.name === undefined ? ingredient.name : normalizeRequiredName(updates.name),
    category: updates.category ?? ingredient.category,
    quantity:
      updates.quantity === undefined
        ? ingredient.quantity
        : normalizeQuantity(updates.quantity),
    unit: updates.unit ?? ingredient.unit,
    purchasedAt:
      updates.purchasedAt === undefined
        ? ingredient.purchasedAt
        : normalizePurchasedAt(updates.purchasedAt),
    expiresAt:
      updates.expiresAt === undefined
        ? ingredient.expiresAt
        : normalizeOptionalText(updates.expiresAt),
    note:
      updates.note === undefined ? ingredient.note : normalizeOptionalText(updates.note),
  };
}

function getSortPriority(expiresAt: string | null) {
  const daysRemaining = daysUntilExpiry(expiresAt);
  return Number.isNaN(daysRemaining) ? Number.POSITIVE_INFINITY : daysRemaining;
}

function sortIngredients(ingredients: Ingredient[]) {
  return [...ingredients].sort((left, right) => {
    const priorityDifference =
      getSortPriority(left.expiresAt) - getSortPriority(right.expiresAt);
    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return left.name.localeCompare(right.name);
  });
}

function migrateIngredientRecord(record: unknown): Ingredient | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const legacyIngredient = record as LegacyIngredientRecord;
  if (
    typeof legacyIngredient.id !== 'string' ||
    typeof legacyIngredient.name !== 'string'
  ) {
    return null;
  }

  const name = legacyIngredient.name.trim();
  if (!name) {
    return null;
  }

  const quantity =
    typeof legacyIngredient.quantity === 'number' &&
    Number.isFinite(legacyIngredient.quantity) &&
    legacyIngredient.quantity > 0
      ? legacyIngredient.quantity
      : 1;

  const category =
    typeof legacyIngredient.category === 'string' &&
    isIngredientCategory(legacyIngredient.category)
      ? legacyIngredient.category
      : DEFAULT_CATEGORY;

  const unit =
    typeof legacyIngredient.unit === 'string' && isIngredientUnit(legacyIngredient.unit)
      ? legacyIngredient.unit
      : DEFAULT_UNIT;

  const purchasedAt =
    typeof legacyIngredient.purchasedAt === 'string' && legacyIngredient.purchasedAt.trim()
      ? legacyIngredient.purchasedAt
      : typeof legacyIngredient.createdAt === 'string' && legacyIngredient.createdAt.trim()
        ? legacyIngredient.createdAt
        : new Date().toISOString();

  const note =
    typeof legacyIngredient.note === 'string'
      ? legacyIngredient.note
      : typeof legacyIngredient.notes === 'string'
        ? legacyIngredient.notes
        : null;

  return {
    id: legacyIngredient.id,
    name,
    category,
    quantity,
    unit,
    purchasedAt,
    expiresAt:
      typeof legacyIngredient.expiresAt === 'string'
        ? normalizeOptionalText(legacyIngredient.expiresAt)
        : null,
    note: normalizeOptionalText(note),
  };
}

function migratePersistedInventoryState(persistedState: unknown): InventoryPersistedState {
  if (!persistedState || typeof persistedState !== 'object') {
    return { ingredients: [] };
  }

  const ingredients = Array.isArray((persistedState as InventoryPersistedState).ingredients)
    ? (persistedState as InventoryPersistedState).ingredients
        .map(migrateIngredientRecord)
        .filter((ingredient): ingredient is Ingredient => ingredient !== null)
    : [];

  return {
    ingredients: sortIngredients(ingredients),
  };
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      ingredients: [],
      addIngredient: (draft) => {
        const ingredient: Ingredient = {
          id: createId('ingredient'),
          ...normalizeIngredientDraft(draft),
        };

        set((state) => ({
          ingredients: sortIngredients([...state.ingredients, ingredient]),
        }));

        return ingredient;
      },
      updateIngredient: (id, updates) => {
        const ingredients = get().ingredients;
        const ingredientIndex = ingredients.findIndex((ingredient) => ingredient.id === id);

        if (ingredientIndex < 0) {
          return null;
        }

        const updatedIngredient = applyIngredientUpdates(ingredients[ingredientIndex], updates);
        const nextIngredients = [...ingredients];
        nextIngredients[ingredientIndex] = updatedIngredient;

        set({
          ingredients: sortIngredients(nextIngredients),
        });

        return updatedIngredient;
      },
      deleteIngredient: (id) =>
        set((state) => ({
          ingredients: state.ingredients.filter((ingredient) => ingredient.id !== id),
        })),
      getAllIngredients: () => sortIngredients(get().ingredients),
      getExpiringIngredients: (days = 3) =>
        sortIngredients(
          get().ingredients.filter((ingredient) =>
            isExpiringSoon(ingredient.expiresAt, days)
          )
        ),
      getExpiredIngredients: () =>
        sortIngredients(
          get().ingredients.filter((ingredient) => isExpired(ingredient.expiresAt))
        ),
      clearInventory: () => set({ ingredients: [] }),
    }),
    {
      name: INVENTORY_STORAGE_KEY,
      version: INVENTORY_STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        ingredients: state.ingredients,
      }),
      migrate: (persistedState) => migratePersistedInventoryState(persistedState),
    }
  )
);

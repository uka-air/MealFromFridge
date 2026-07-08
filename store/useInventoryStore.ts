import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createDevelopmentIngredientDrafts } from '@/data';
import type { IngredientQuantityPatch } from '@/types/cooking';
import {
  INGREDIENT_CATEGORIES,
  INGREDIENT_STATUSES,
  INGREDIENT_UNITS,
  type Ingredient,
  type IngredientCategory,
  type IngredientDraft,
  type IngredientStatus,
  type IngredientUnit,
  type IngredientUpdate,
} from '@/types/ingredient';
import { daysUntilExpiry, isExpired, isExpiringSoon } from '@/utils/date';
import { createId } from '@/utils/id';
import { isIngredientActive, isIngredientUsedUp } from '@/utils/inventory';

const INVENTORY_STORAGE_KEY = 'meal-from-fridge-inventory';
const INVENTORY_STORE_VERSION = 3;
const DEFAULT_CATEGORY: IngredientCategory = 'other';
const DEFAULT_UNIT: IngredientUnit = 'item';
const DEFAULT_STATUS: IngredientStatus = 'active';

interface InventoryState {
  ingredients: Ingredient[];
  addIngredient: (draft: IngredientDraft) => Ingredient;
  updateIngredient: (id: string, updates: IngredientUpdate) => Ingredient | null;
  deleteIngredient: (id: string) => void;
  applyIngredientQuantityPatches: (patches: IngredientQuantityPatch[]) => void;
  loadDevelopmentSeedData: () => void;
  getAllIngredients: (includeUsedUp?: boolean) => Ingredient[];
  getActiveIngredients: () => Ingredient[];
  getExpiringIngredients: (days?: number, includeUsedUp?: boolean) => Ingredient[];
  getExpiredIngredients: (includeUsedUp?: boolean) => Ingredient[];
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
  status?: unknown;
  createdAt?: unknown;
}

function isIngredientCategory(value: string): value is IngredientCategory {
  return INGREDIENT_CATEGORIES.includes(value as IngredientCategory);
}

function isIngredientUnit(value: string): value is IngredientUnit {
  return INGREDIENT_UNITS.includes(value as IngredientUnit);
}

function isIngredientStatus(value: string): value is IngredientStatus {
  return INGREDIENT_STATUSES.includes(value as IngredientStatus);
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
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

function normalizeStoredQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity < 0) {
    return 0;
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

function resolveIngredientStatus(quantity: number, status?: IngredientStatus) {
  if (quantity <= 0) {
    return 'used_up' as const;
  }

  return status === 'used_up' ? 'used_up' : DEFAULT_STATUS;
}

function normalizeIngredientDraft(draft: IngredientDraft): Omit<Ingredient, 'id'> {
  const quantity = normalizeQuantity(draft.quantity);

  return {
    name: normalizeRequiredName(draft.name),
    category: draft.category,
    quantity,
    unit: draft.unit,
    purchasedAt: normalizePurchasedAt(draft.purchasedAt),
    expiresAt: normalizeOptionalText(draft.expiresAt),
    note: normalizeOptionalText(draft.note),
    status: resolveIngredientStatus(quantity, draft.status),
  };
}

function applyIngredientUpdates(ingredient: Ingredient, updates: IngredientUpdate): Ingredient {
  const quantity =
    updates.quantity === undefined
      ? ingredient.quantity
      : normalizeQuantity(updates.quantity);

  return {
    id: ingredient.id,
    name: updates.name === undefined ? ingredient.name : normalizeRequiredName(updates.name),
    category: updates.category ?? ingredient.category,
    quantity,
    unit: updates.unit ?? ingredient.unit,
    purchasedAt:
      updates.purchasedAt === undefined
        ? ingredient.purchasedAt
        : normalizePurchasedAt(updates.purchasedAt),
    expiresAt:
      updates.expiresAt === undefined
        ? ingredient.expiresAt
        : normalizeOptionalText(updates.expiresAt),
    note: updates.note === undefined ? ingredient.note : normalizeOptionalText(updates.note),
    status: resolveIngredientStatus(quantity, updates.status ?? ingredient.status),
  };
}

function getSortPriority(ingredient: Ingredient) {
  if (isIngredientUsedUp(ingredient)) {
    return Number.MAX_SAFE_INTEGER;
  }

  const daysRemaining = daysUntilExpiry(ingredient.expiresAt);
  return Number.isNaN(daysRemaining) ? Number.MAX_SAFE_INTEGER - 1 : daysRemaining;
}

function sortIngredients(ingredients: Ingredient[]) {
  return [...ingredients].sort((left, right) => {
    const leftIsUsedUp = isIngredientUsedUp(left);
    const rightIsUsedUp = isIngredientUsedUp(right);

    if (leftIsUsedUp !== rightIsUsedUp) {
      return leftIsUsedUp ? 1 : -1;
    }

    const priorityDifference = getSortPriority(left) - getSortPriority(right);
    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return left.name.localeCompare(right.name);
  });
}

function getVisibleIngredients(ingredients: Ingredient[], includeUsedUp = false) {
  return includeUsedUp ? ingredients : ingredients.filter(isIngredientActive);
}

function mergeIngredientDraftsByName(ingredients: Ingredient[], drafts: IngredientDraft[]) {
  const nextIngredients = [...ingredients];

  drafts.forEach((draft) => {
    const normalizedDraft = normalizeIngredientDraft(draft);
    const existingIndex = nextIngredients.findIndex(
      (ingredient) => normalizeName(ingredient.name) === normalizeName(normalizedDraft.name)
    );

    if (existingIndex >= 0) {
      nextIngredients[existingIndex] = {
        id: nextIngredients[existingIndex].id,
        ...normalizedDraft,
      };
      return;
    }

    nextIngredients.push({
      id: createId('ingredient'),
      ...normalizedDraft,
    });
  });

  return sortIngredients(nextIngredients);
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
    typeof legacyIngredient.quantity === 'number'
      ? normalizeStoredQuantity(legacyIngredient.quantity)
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

  const status =
    typeof legacyIngredient.status === 'string' && isIngredientStatus(legacyIngredient.status)
      ? legacyIngredient.status
      : undefined;

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
    status: resolveIngredientStatus(quantity, status),
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
      applyIngredientQuantityPatches: (patches) => {
        if (!patches.length) {
          return;
        }

        const patchMap = new Map(patches.map((patch) => [patch.id, patch]));

        set((state) => ({
          ingredients: sortIngredients(
            state.ingredients.map((ingredient) => {
              const patch = patchMap.get(ingredient.id);
              if (!patch) {
                return ingredient;
              }

              const quantity = normalizeStoredQuantity(patch.quantity);
              return {
                ...ingredient,
                quantity,
                status: resolveIngredientStatus(quantity, patch.status),
              };
            })
          ),
        }));
      },
      loadDevelopmentSeedData: () =>
        set((state) => ({
          ingredients: mergeIngredientDraftsByName(
            state.ingredients,
            createDevelopmentIngredientDrafts()
          ),
        })),
      getAllIngredients: (includeUsedUp = false) =>
        sortIngredients(getVisibleIngredients(get().ingredients, includeUsedUp)),
      getActiveIngredients: () =>
        sortIngredients(get().ingredients.filter(isIngredientActive)),
      getExpiringIngredients: (days = 3, includeUsedUp = false) =>
        sortIngredients(
          getVisibleIngredients(get().ingredients, includeUsedUp).filter((ingredient) =>
            isExpiringSoon(ingredient.expiresAt, days)
          )
        ),
      getExpiredIngredients: (includeUsedUp = false) =>
        sortIngredients(
          getVisibleIngredients(get().ingredients, includeUsedUp).filter((ingredient) =>
            isExpired(ingredient.expiresAt)
          )
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

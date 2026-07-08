import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CookingHistory, CookingHistoryDeductedItem, CookingHistorySkippedItem } from '@/types/cooking';

const COOKING_HISTORY_STORAGE_KEY = 'meal-from-fridge-cooking-history';
const COOKING_HISTORY_STORE_VERSION = 1;

interface CookingHistoryState {
  history: CookingHistory[];
  addCookingHistoryRecord: (record: CookingHistory) => void;
  removeCookingHistoryRecord: (id: string) => void;
  getCookingHistory: () => CookingHistory[];
  getCookingHistoryByRecipeId: (recipeId: string) => CookingHistory[];
}

type CookingHistoryPersistedState = Pick<CookingHistoryState, 'history'>;

interface PersistedCookingHistoryRecord {
  id?: unknown;
  recipeId?: unknown;
  recipeName?: unknown;
  cookedAt?: unknown;
  deductedItems?: unknown;
  skippedItems?: unknown;
}

function sortHistory(records: CookingHistory[]) {
  return [...records].sort((left, right) => right.cookedAt.localeCompare(left.cookedAt));
}

function normalizeDeductedItem(item: unknown): CookingHistoryDeductedItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;
  if (
    typeof record.inventoryIngredientId !== 'string' ||
    typeof record.inventoryIngredientName !== 'string' ||
    typeof record.deductedQuantity !== 'number' ||
    typeof record.unit !== 'string' ||
    typeof record.remainingQuantity !== 'number'
  ) {
    return null;
  }

  return {
    inventoryIngredientId: record.inventoryIngredientId,
    inventoryIngredientName: record.inventoryIngredientName,
    deductedQuantity: record.deductedQuantity,
    unit: record.unit as CookingHistoryDeductedItem['unit'],
    remainingQuantity: record.remainingQuantity,
  };
}

function normalizeSkippedItem(item: unknown): CookingHistorySkippedItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;
  if (
    typeof record.recipeIngredientName !== 'string' ||
    typeof record.reason !== 'string'
  ) {
    return null;
  }

  return {
    recipeIngredientName: record.recipeIngredientName,
    reason: record.reason as CookingHistorySkippedItem['reason'],
  };
}

function normalizeCookingHistoryRecord(record: unknown): CookingHistory | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const item = record as PersistedCookingHistoryRecord;
  if (
    typeof item.id !== 'string' ||
    typeof item.recipeId !== 'string' ||
    typeof item.recipeName !== 'string' ||
    typeof item.cookedAt !== 'string'
  ) {
    return null;
  }

  return {
    id: item.id,
    recipeId: item.recipeId,
    recipeName: item.recipeName,
    cookedAt: item.cookedAt,
    deductedItems: Array.isArray(item.deductedItems)
      ? item.deductedItems
          .map(normalizeDeductedItem)
          .filter((deductedItem): deductedItem is CookingHistoryDeductedItem => deductedItem !== null)
      : [],
    skippedItems: Array.isArray(item.skippedItems)
      ? item.skippedItems
          .map(normalizeSkippedItem)
          .filter((skippedItem): skippedItem is CookingHistorySkippedItem => skippedItem !== null)
      : [],
  };
}

function migratePersistedCookingHistoryState(
  persistedState: unknown
): CookingHistoryPersistedState {
  if (!persistedState || typeof persistedState !== 'object') {
    return { history: [] };
  }

  const history = Array.isArray((persistedState as CookingHistoryPersistedState).history)
    ? (persistedState as CookingHistoryPersistedState).history
        .map(normalizeCookingHistoryRecord)
        .filter((record): record is CookingHistory => record !== null)
    : [];

  return {
    history: sortHistory(history),
  };
}

export const useCookingHistoryStore = create<CookingHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      addCookingHistoryRecord: (record) =>
        set((state) => ({
          history: sortHistory([record, ...state.history]),
        })),
      removeCookingHistoryRecord: (id) =>
        set((state) => ({
          history: state.history.filter((record) => record.id !== id),
        })),
      getCookingHistory: () => sortHistory(get().history),
      getCookingHistoryByRecipeId: (recipeId) =>
        sortHistory(get().history.filter((record) => record.recipeId === recipeId)),
    }),
    {
      name: COOKING_HISTORY_STORAGE_KEY,
      version: COOKING_HISTORY_STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        history: state.history,
      }),
      migrate: (persistedState) => migratePersistedCookingHistoryState(persistedState),
    }
  )
);

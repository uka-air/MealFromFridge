import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ParsedReceiptItem, ReceiptImportDraft, ReceiptImportHistory } from '@/types/receipt';

const RECEIPT_IMPORT_STORAGE_KEY = 'meal-from-fridge-receipt-import';
const RECEIPT_IMPORT_STORE_VERSION = 1;

interface ReceiptImportState {
  draftImport: ReceiptImportDraft | null;
  history: ReceiptImportHistory[];
  setDraftImport: (draft: ReceiptImportDraft) => void;
  clearDraftImport: () => void;
  addReceiptImportHistory: (record: ReceiptImportHistory) => void;
  getReceiptImportHistory: () => ReceiptImportHistory[];
}

type ReceiptImportPersistedState = Pick<ReceiptImportState, 'history'>;

function sortHistory(records: ReceiptImportHistory[]) {
  return [...records].sort((left, right) => right.importedAt.localeCompare(left.importedAt));
}

function normalizeParsedReceiptItem(item: unknown): ParsedReceiptItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;
  if (typeof record.rawLine !== 'string' || typeof record.name !== 'string') {
    return null;
  }

  return {
    rawLine: record.rawLine,
    name: record.name,
    quantity: typeof record.quantity === 'number' ? record.quantity : undefined,
    unit: typeof record.unit === 'string' ? record.unit : undefined,
    price: typeof record.price === 'number' ? record.price : undefined,
    barcode: typeof record.barcode === 'string' ? record.barcode : undefined,
    confidence: typeof record.confidence === 'number' ? record.confidence : 0.3,
    category: typeof record.category === 'string' ? (record.category as ParsedReceiptItem['category']) : undefined,
  };
}

function normalizeReceiptImportHistory(record: unknown): ReceiptImportHistory | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const item = record as Record<string, unknown>;
  if (
    typeof item.id !== 'string' ||
    typeof item.importedAt !== 'string' ||
    typeof item.rawText !== 'string' ||
    !Array.isArray(item.addedIngredientIds)
  ) {
    return null;
  }

  return {
    id: item.id,
    importedAt: item.importedAt,
    storeName: typeof item.storeName === 'string' ? item.storeName : undefined,
    purchasedAt: typeof item.purchasedAt === 'string' ? item.purchasedAt : undefined,
    imageUri: typeof item.imageUri === 'string' ? item.imageUri : undefined,
    rawText: item.rawText,
    addedIngredientIds: item.addedIngredientIds.filter(
      (ingredientId): ingredientId is string => typeof ingredientId === 'string'
    ),
    skippedItems: Array.isArray(item.skippedItems)
      ? item.skippedItems
          .map(normalizeParsedReceiptItem)
          .filter((skippedItem): skippedItem is ParsedReceiptItem => skippedItem !== null)
      : [],
  };
}

function migratePersistedReceiptImportState(
  persistedState: unknown
): ReceiptImportPersistedState {
  if (!persistedState || typeof persistedState !== 'object') {
    return { history: [] };
  }

  const history = Array.isArray((persistedState as ReceiptImportPersistedState).history)
    ? (persistedState as ReceiptImportPersistedState).history
        .map(normalizeReceiptImportHistory)
        .filter((item): item is ReceiptImportHistory => item !== null)
    : [];

  return {
    history: sortHistory(history),
  };
}

export const useReceiptImportStore = create<ReceiptImportState>()(
  persist(
    (set, get) => ({
      draftImport: null,
      history: [],
      setDraftImport: (draft) => set({ draftImport: draft }),
      clearDraftImport: () => set({ draftImport: null }),
      addReceiptImportHistory: (record) =>
        set((state) => ({
          history: sortHistory([record, ...state.history]),
        })),
      getReceiptImportHistory: () => sortHistory(get().history),
    }),
    {
      name: RECEIPT_IMPORT_STORAGE_KEY,
      version: RECEIPT_IMPORT_STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        history: state.history,
      }),
      migrate: (persistedState) => migratePersistedReceiptImportState(persistedState),
    }
  )
);

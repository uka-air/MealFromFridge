import { create } from 'zustand';

import { useCookingHistoryStore } from '@/store/useCookingHistoryStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import type { CookingHistory } from '@/types/cooking';
import { undoRecipeDeduction } from '@/utils/recipe-deduction';

interface CookingSessionState {
  pendingUndoHistory: CookingHistory | null;
  setPendingUndoHistory: (record: CookingHistory | null) => void;
  clearPendingUndoHistory: () => void;
  undoLatestCooking: () => boolean;
}

export const useCookingSessionStore = create<CookingSessionState>((set, get) => ({
  pendingUndoHistory: null,
  setPendingUndoHistory: (record) => set({ pendingUndoHistory: record }),
  clearPendingUndoHistory: () => set({ pendingUndoHistory: null }),
  undoLatestCooking: () => {
    const record = get().pendingUndoHistory;
    if (!record) {
      return false;
    }

    useInventoryStore.getState().applyIngredientQuantityPatches(undoRecipeDeduction(record));
    useCookingHistoryStore.getState().removeCookingHistoryRecord(record.id);
    set({ pendingUndoHistory: null });

    return true;
  },
}));

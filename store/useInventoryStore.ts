import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Ingredient, IngredientDraft } from '@/types/ingredient';
import { createId } from '@/utils/id';

interface InventoryState {
  ingredients: Ingredient[];
  addIngredient: (draft: IngredientDraft) => string;
  updateIngredient: (id: string, draft: IngredientDraft) => void;
  removeIngredient: (id: string) => void;
  clearInventory: () => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      ingredients: [],
      addIngredient: (draft) => {
        const timestamp = new Date().toISOString();
        const ingredient: Ingredient = {
          id: createId('ingredient'),
          createdAt: timestamp,
          updatedAt: timestamp,
          ...draft,
        };

        set((state) => ({
          ingredients: [ingredient, ...state.ingredients],
        }));

        return ingredient.id;
      },
      updateIngredient: (id, draft) =>
        set((state) => ({
          ingredients: state.ingredients.map((ingredient) =>
            ingredient.id === id
              ? {
                  ...ingredient,
                  ...draft,
                  updatedAt: new Date().toISOString(),
                }
              : ingredient
          ),
        })),
      removeIngredient: (id) =>
        set((state) => ({
          ingredients: state.ingredients.filter((ingredient) => ingredient.id !== id),
        })),
      clearInventory: () => set({ ingredients: [] }),
    }),
    {
      name: 'meal-from-fridge-inventory',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

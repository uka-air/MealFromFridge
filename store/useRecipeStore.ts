import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Recipe, RecipeDraft } from '@/types/recipe';
import { createId } from '@/utils/id';

interface RecipeState {
  recipes: Recipe[];
  addRecipe: (draft: RecipeDraft) => string;
  updateRecipe: (id: string, draft: RecipeDraft) => void;
  removeRecipe: (id: string) => void;
  clearRecipes: () => void;
}

export const useRecipeStore = create<RecipeState>()(
  persist(
    (set) => ({
      recipes: [],
      addRecipe: (draft) => {
        const timestamp = new Date().toISOString();
        const recipe: Recipe = {
          id: createId('recipe'),
          createdAt: timestamp,
          updatedAt: timestamp,
          ...draft,
          ingredients: draft.ingredients.map((ingredient) => ({
            id: createId('recipe-ingredient'),
            ...ingredient,
          })),
        };

        set((state) => ({
          recipes: [recipe, ...state.recipes],
        }));

        return recipe.id;
      },
      updateRecipe: (id, draft) =>
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === id
              ? {
                  ...recipe,
                  ...draft,
                  ingredients: draft.ingredients.map((ingredient) => ({
                    id: createId('recipe-ingredient'),
                    ...ingredient,
                  })),
                  updatedAt: new Date().toISOString(),
                }
              : recipe
          ),
        })),
      removeRecipe: (id) =>
        set((state) => ({
          recipes: state.recipes.filter((recipe) => recipe.id !== id),
        })),
      clearRecipes: () => set({ recipes: [] }),
    }),
    {
      name: 'meal-from-fridge-recipes',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

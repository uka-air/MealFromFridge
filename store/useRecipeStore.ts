import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createSeedRecipeDrafts } from '@/data';
import type { Recipe, RecipeDraft } from '@/types/recipe';
import { createId } from '@/utils/id';

const RECIPE_STORAGE_KEY = 'meal-from-fridge-recipes';
const RECIPE_STORE_VERSION = 2;

interface RecipeState {
  recipes: Recipe[];
  hasInitializedSeedData: boolean;
  addRecipe: (draft: RecipeDraft) => string;
  updateRecipe: (id: string, draft: RecipeDraft) => void;
  removeRecipe: (id: string) => void;
  initializeRecipeSeedData: () => void;
  clearRecipes: () => void;
}

type RecipePersistedState = Pick<RecipeState, 'recipes' | 'hasInitializedSeedData'>;

function createStoredRecipe(draft: RecipeDraft): Recipe {
  const timestamp = new Date().toISOString();

  return {
    id: createId('recipe'),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...draft,
    ingredients: draft.ingredients.map((ingredient) => ({
      id: createId('recipe-ingredient'),
      ...ingredient,
      matchAnyOf: ingredient.matchAnyOf ? [...ingredient.matchAnyOf] : undefined,
    })),
  };
}

function migratePersistedRecipeState(persistedState: unknown): RecipePersistedState {
  if (!persistedState || typeof persistedState !== 'object') {
    return {
      recipes: [],
      hasInitializedSeedData: false,
    };
  }

  const recipes = Array.isArray((persistedState as RecipePersistedState).recipes)
    ? (persistedState as RecipePersistedState).recipes
    : [];

  return {
    recipes,
    hasInitializedSeedData: true,
  };
}

export const useRecipeStore = create<RecipeState>()(
  persist(
    (set) => ({
      recipes: [],
      hasInitializedSeedData: false,
      addRecipe: (draft) => {
        const recipe = createStoredRecipe(draft);

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
                    matchAnyOf: ingredient.matchAnyOf ? [...ingredient.matchAnyOf] : undefined,
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
      initializeRecipeSeedData: () =>
        set((state) => {
          if (state.hasInitializedSeedData) {
            return state;
          }

          return {
            recipes: state.recipes.length
              ? state.recipes
              : createSeedRecipeDrafts().map((draft) => createStoredRecipe(draft)),
            hasInitializedSeedData: true,
          };
        }),
      clearRecipes: () => set({ recipes: [] }),
    }),
    {
      name: RECIPE_STORAGE_KEY,
      version: RECIPE_STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        recipes: state.recipes,
        hasInitializedSeedData: state.hasInitializedSeedData,
      }),
      migrate: (persistedState) => migratePersistedRecipeState(persistedState),
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          state?.initializeRecipeSeedData();
        }
      },
    }
  )
);

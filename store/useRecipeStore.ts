import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createDevelopmentRecipeDrafts, createSeedRecipeDrafts } from '@/data';
import { INGREDIENT_UNITS, type IngredientUnit } from '@/types/ingredient';
import type { Recipe, RecipeDraft, RecipeIngredientRequirement } from '@/types/recipe';
import { createId } from '@/utils/id';

const RECIPE_STORAGE_KEY = 'meal-from-fridge-recipes';
const RECIPE_STORE_VERSION = 3;

interface RecipeState {
  recipes: Recipe[];
  hasInitializedSeedData: boolean;
  addRecipe: (draft: RecipeDraft) => string;
  updateRecipe: (id: string, draft: RecipeDraft) => void;
  toggleFavoriteRecipe: (id: string) => void;
  removeRecipe: (id: string) => void;
  initializeRecipeSeedData: () => void;
  loadDevelopmentSeedData: () => void;
  clearRecipes: () => void;
}

type RecipePersistedState = Pick<RecipeState, 'recipes' | 'hasInitializedSeedData'>;

interface PersistedRecipeIngredientRecord {
  id?: unknown;
  ingredientName?: unknown;
  quantity?: unknown;
  unit?: unknown;
  optional?: unknown;
  matchAnyOf?: unknown;
}

interface PersistedRecipeRecord {
  id?: unknown;
  name?: unknown;
  isFavorite?: unknown;
  description?: unknown;
  ingredients?: unknown;
  instructions?: unknown;
  prepMinutes?: unknown;
  cookMinutes?: unknown;
  servings?: unknown;
  tags?: unknown;
  notes?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function isIngredientUnit(value: unknown): value is IngredientUnit {
  return (
    typeof value === 'string' &&
    INGREDIENT_UNITS.includes(value as IngredientUnit)
  );
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRecipeIngredient(
  ingredient: unknown
): RecipeIngredientRequirement | null {
  if (!ingredient || typeof ingredient !== 'object') {
    return null;
  }

  const record = ingredient as PersistedRecipeIngredientRecord;
  if (typeof record.id !== 'string' || typeof record.ingredientName !== 'string') {
    return null;
  }

  const ingredientName = record.ingredientName.trim();
  if (!ingredientName) {
    return null;
  }

  return {
    id: record.id,
    ingredientName,
    quantity:
      typeof record.quantity === 'number' && Number.isFinite(record.quantity)
        ? record.quantity
        : undefined,
    unit: isIngredientUnit(record.unit) ? record.unit : undefined,
    optional: typeof record.optional === 'boolean' ? record.optional : undefined,
    matchAnyOf: Array.isArray(record.matchAnyOf)
      ? record.matchAnyOf.filter((value): value is string => typeof value === 'string')
      : undefined,
  };
}

function normalizeRecipeRecord(recipe: unknown): Recipe | null {
  if (!recipe || typeof recipe !== 'object') {
    return null;
  }

  const record = recipe as PersistedRecipeRecord;
  if (typeof record.id !== 'string' || typeof record.name !== 'string') {
    return null;
  }

  const name = record.name.trim();
  if (!name) {
    return null;
  }

  const timestamp = new Date().toISOString();

  return {
    id: record.id,
    name,
    isFavorite: typeof record.isFavorite === 'boolean' ? record.isFavorite : false,
    description: typeof record.description === 'string' ? record.description : '',
    ingredients: Array.isArray(record.ingredients)
      ? record.ingredients
          .map(normalizeRecipeIngredient)
          .filter((ingredient): ingredient is RecipeIngredientRequirement => ingredient !== null)
      : [],
    instructions: Array.isArray(record.instructions)
      ? record.instructions.filter((instruction): instruction is string => typeof instruction === 'string')
      : [],
    prepMinutes:
      typeof record.prepMinutes === 'number' && Number.isFinite(record.prepMinutes)
        ? record.prepMinutes
        : 0,
    cookMinutes:
      typeof record.cookMinutes === 'number' && Number.isFinite(record.cookMinutes)
        ? record.cookMinutes
        : 0,
    servings:
      typeof record.servings === 'number' && Number.isFinite(record.servings) && record.servings > 0
        ? record.servings
        : 1,
    tags: Array.isArray(record.tags)
      ? record.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    notes: typeof record.notes === 'string' ? record.notes : undefined,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : timestamp,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : timestamp,
  };
}

function createStoredRecipe(draft: RecipeDraft): Recipe {
  const timestamp = new Date().toISOString();

  return {
    id: createId('recipe'),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...draft,
    isFavorite: draft.isFavorite ?? false,
    ingredients: draft.ingredients.map((ingredient) => ({
      id: createId('recipe-ingredient'),
      ...ingredient,
      matchAnyOf: ingredient.matchAnyOf ? [...ingredient.matchAnyOf] : undefined,
    })),
  };
}

function applyRecipeDraftToRecipe(recipe: Recipe, draft: RecipeDraft): Recipe {
  return {
    ...recipe,
    ...draft,
    isFavorite: draft.isFavorite ?? recipe.isFavorite,
    ingredients: draft.ingredients.map((ingredient) => ({
      id: createId('recipe-ingredient'),
      ...ingredient,
      matchAnyOf: ingredient.matchAnyOf ? [...ingredient.matchAnyOf] : undefined,
    })),
    updatedAt: new Date().toISOString(),
  };
}

function mergeRecipeDraftsByName(recipes: Recipe[], drafts: RecipeDraft[]) {
  const nextRecipes = [...recipes];

  drafts.forEach((draft) => {
    const existingIndex = nextRecipes.findIndex(
      (recipe) => normalizeName(recipe.name) === normalizeName(draft.name)
    );

    if (existingIndex >= 0) {
      nextRecipes[existingIndex] = applyRecipeDraftToRecipe(
        nextRecipes[existingIndex],
        draft
      );
      return;
    }

    nextRecipes.push(createStoredRecipe(draft));
  });

  return nextRecipes;
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
        .map(normalizeRecipeRecord)
        .filter((recipe): recipe is Recipe => recipe !== null)
    : [];

  const hasInitializedSeedData =
    typeof (persistedState as RecipePersistedState).hasInitializedSeedData === 'boolean'
      ? (persistedState as RecipePersistedState).hasInitializedSeedData
      : recipes.length > 0;

  return {
    recipes,
    hasInitializedSeedData,
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
              ? applyRecipeDraftToRecipe(recipe, draft)
              : recipe
          ),
        })),
      toggleFavoriteRecipe: (id) =>
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === id
              ? {
                  ...recipe,
                  isFavorite: !recipe.isFavorite,
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
      loadDevelopmentSeedData: () =>
        set((state) => ({
          recipes: mergeRecipeDraftsByName(
            state.recipes,
            createDevelopmentRecipeDrafts()
          ),
          hasInitializedSeedData: true,
        })),
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

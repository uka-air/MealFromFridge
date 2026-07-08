import { create } from 'zustand';

import type { ParsedRecipe } from '@/types/recipe-import';

interface RecipeImportState {
  importedRecipe: ParsedRecipe | null;
  setImportedRecipe: (recipe: ParsedRecipe) => void;
  clearImportedRecipe: () => void;
}

export const useRecipeImportStore = create<RecipeImportState>((set) => ({
  importedRecipe: null,
  setImportedRecipe: (recipe) => set({ importedRecipe: recipe }),
  clearImportedRecipe: () => set({ importedRecipe: null }),
}));

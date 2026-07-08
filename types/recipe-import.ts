import type { IngredientUnit } from '@/types/ingredient';

export interface ParsedRecipeIngredient {
  name: string;
  quantity?: number;
  unit?: IngredientUnit;
  optional?: boolean;
  rawText: string;
}

export interface ParsedRecipe {
  name: string;
  ingredients: ParsedRecipeIngredient[];
  steps: string[];
}

export interface RecipeTextParser {
  parse: (text: string) => ParsedRecipe;
}

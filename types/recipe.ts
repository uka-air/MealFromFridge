import type { IngredientUnit } from '@/types/ingredient';

export interface RecipeIngredientRequirement {
  id: string;
  ingredientName: string;
  quantity?: number;
  unit?: IngredientUnit;
  optional?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: RecipeIngredientRequirement[];
  instructions: string[];
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeDraft {
  name: string;
  description: string;
  ingredients: Omit<RecipeIngredientRequirement, 'id'>[];
  instructions: string[];
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  tags: string[];
  notes?: string;
}

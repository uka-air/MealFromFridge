export const INGREDIENT_CATEGORIES = [
  'produce',
  'protein',
  'dairy',
  'grains',
  'pantry',
  'frozen',
  'spices',
  'other',
] as const;

export const INGREDIENT_UNITS = [
  'item',
  'g',
  'kg',
  'ml',
  'l',
  'cup',
  'tbsp',
  'tsp',
  'oz',
  'lb',
  'pack',
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: IngredientUnit;
  category: IngredientCategory;
  expiresAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientDraft {
  name: string;
  quantity: number;
  unit: IngredientUnit;
  category: IngredientCategory;
  expiresAt?: string;
  notes?: string;
}

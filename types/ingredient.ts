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
  category: IngredientCategory;
  quantity: number;
  unit: IngredientUnit;
  purchasedAt: string;
  expiresAt: string | null;
  note: string | null;
}

export interface IngredientDraft {
  name: string;
  category: IngredientCategory;
  quantity: number;
  unit: IngredientUnit;
  purchasedAt?: string;
  expiresAt?: string | null;
  note?: string | null;
}

export type IngredientUpdate = Partial<IngredientDraft>;

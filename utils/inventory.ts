import type { Ingredient } from '@/types/ingredient';

export function isIngredientUsedUp(ingredient: Ingredient) {
  return ingredient.status === 'used_up' || ingredient.quantity <= 0;
}

export function isIngredientActive(ingredient: Ingredient) {
  return !isIngredientUsedUp(ingredient);
}

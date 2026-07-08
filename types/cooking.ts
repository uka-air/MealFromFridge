import type { Ingredient, IngredientStatus, IngredientUnit } from '@/types/ingredient';
import type { RecipeIngredientRequirement } from '@/types/recipe';

export type CookingSkippedReason =
  | 'missing'
  | 'unit_mismatch'
  | 'no_quantity'
  | 'optional_not_available';

export type IngredientMatchType = 'exact' | 'partial' | 'alias';

export interface CookingHistoryDeductedItem {
  inventoryIngredientId: string;
  inventoryIngredientName: string;
  deductedQuantity: number;
  unit: IngredientUnit;
  remainingQuantity: number;
}

export interface CookingHistorySkippedItem {
  recipeIngredientName: string;
  reason: CookingSkippedReason;
}

export interface CookingHistory {
  id: string;
  recipeId: string;
  recipeName: string;
  cookedAt: string;
  deductedItems: CookingHistoryDeductedItem[];
  skippedItems: CookingHistorySkippedItem[];
}

export interface MatchedRecipeIngredientToInventory {
  recipeIngredient: RecipeIngredientRequirement;
  inventoryIngredient: Ingredient;
  matchedName: string;
  matchType: IngredientMatchType;
  canAutoDeduct: boolean;
  reason?: Exclude<CookingSkippedReason, 'missing' | 'optional_not_available'>;
}

export interface RecipeDeductionLineItem {
  recipeIngredientId: string;
  recipeIngredientName: string;
  recipeQuantity?: number;
  recipeUnit?: IngredientUnit;
  optional: boolean;
}

export interface RecipeDeductionItem {
  inventoryIngredientId: string;
  inventoryIngredientName: string;
  currentQuantity: number;
  unit: IngredientUnit;
  deductionQuantity: number;
  remainingQuantity: number;
  matchedRecipeIngredients: RecipeDeductionLineItem[];
}

export interface RecipeDeductionSkippedItem {
  recipeIngredientId: string;
  recipeIngredientName: string;
  optional: boolean;
  reason: CookingSkippedReason;
  recipeQuantity?: number;
  recipeUnit?: IngredientUnit;
  inventoryIngredientId?: string;
  inventoryIngredientName?: string;
  inventoryQuantity?: number;
  inventoryUnit?: IngredientUnit;
}

export interface RecipeDeductionPlan {
  recipeId: string;
  recipeName: string;
  deductibleItems: RecipeDeductionItem[];
  skippedItems: RecipeDeductionSkippedItem[];
  missingIngredients: RecipeDeductionSkippedItem[];
  ingredientsWithoutQuantity: RecipeDeductionSkippedItem[];
  manualAdjustmentItems: RecipeDeductionSkippedItem[];
  requiredIngredientCount: number;
  matchedRequiredIngredientCount: number;
  allRequiredIngredientsMissing: boolean;
  canCook: boolean;
}

export interface IngredientQuantityPatch {
  id: string;
  quantity: number;
  status: IngredientStatus;
}

export interface AppliedRecipeDeduction {
  ingredientPatches: IngredientQuantityPatch[];
  historyRecord: CookingHistory;
}

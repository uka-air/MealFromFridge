import type {
  AppliedRecipeDeduction,
  CookingHistory,
  IngredientMatchType,
  IngredientQuantityPatch,
  MatchedRecipeIngredientToInventory,
  RecipeDeductionItem,
  RecipeDeductionLineItem,
  RecipeDeductionPlan,
  RecipeDeductionSkippedItem,
} from '@/types/cooking';
import type { Ingredient } from '@/types/ingredient';
import type { Recipe, RecipeIngredientRequirement } from '@/types/recipe';
import { createId } from '@/utils/id';
import { isIngredientActive } from '@/utils/inventory';

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function clampQuantity(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getRequirementMatchNames(requirement: RecipeIngredientRequirement) {
  return [
    requirement.ingredientName,
    ...(requirement.matchAnyOf ?? []),
  ]
    .map((value) => value.trim())
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
}

interface IngredientNameMatchResult {
  matchedName: string;
  matchType: IngredientMatchType;
  score: number;
}

function getIngredientNameMatch(
  requirement: RecipeIngredientRequirement,
  inventoryIngredient: Ingredient
): IngredientNameMatchResult | null {
  const inventoryName = normalize(inventoryIngredient.name);
  let bestMatch: IngredientNameMatchResult | null = null;

  getRequirementMatchNames(requirement).forEach((candidateName, index) => {
    const normalizedCandidate = normalize(candidateName);
    if (!normalizedCandidate) {
      return;
    }

    const isExactMatch = inventoryName === normalizedCandidate;
    const isPartialMatch =
      inventoryName.includes(normalizedCandidate) ||
      normalizedCandidate.includes(inventoryName);

    if (!isExactMatch && !isPartialMatch) {
      return;
    }

    const matchType: IngredientMatchType = index > 0
      ? 'alias'
      : isExactMatch
        ? 'exact'
        : 'partial';

    const scoreBase =
      matchType === 'exact' ? 120 : matchType === 'alias' ? 90 : 80;
    const score = scoreBase - Math.abs(inventoryName.length - normalizedCandidate.length);
    const candidateMatch: IngredientNameMatchResult = {
      matchedName: candidateName,
      matchType,
      score,
    };

    if (!bestMatch || candidateMatch.score > bestMatch.score) {
      bestMatch = candidateMatch;
    }
  });

  return bestMatch;
}

function hasPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function buildSkippedItem(
  requirement: RecipeIngredientRequirement,
  reason: RecipeDeductionSkippedItem['reason'],
  inventoryIngredient?: Ingredient
): RecipeDeductionSkippedItem {
  return {
    recipeIngredientId: requirement.id,
    recipeIngredientName: requirement.ingredientName,
    optional: !!requirement.optional,
    reason,
    recipeQuantity: requirement.quantity,
    recipeUnit: requirement.unit,
    inventoryIngredientId: inventoryIngredient?.id,
    inventoryIngredientName: inventoryIngredient?.name,
    inventoryQuantity: inventoryIngredient?.quantity,
    inventoryUnit: inventoryIngredient?.unit,
  };
}

function buildLineItem(requirement: RecipeIngredientRequirement): RecipeDeductionLineItem {
  return {
    recipeIngredientId: requirement.id,
    recipeIngredientName: requirement.ingredientName,
    recipeQuantity: requirement.quantity,
    recipeUnit: requirement.unit,
    optional: !!requirement.optional,
  };
}

function sanitizeDeductionItem(item: RecipeDeductionItem): RecipeDeductionItem {
  const deductionQuantity = clampQuantity(item.deductionQuantity, 0, item.currentQuantity);

  return {
    ...item,
    deductionQuantity,
    remainingQuantity: Math.max(0, item.currentQuantity - deductionQuantity),
  };
}

export function matchRecipeIngredientToInventory(
  recipeIngredient: RecipeIngredientRequirement,
  inventory: Ingredient[]
): MatchedRecipeIngredientToInventory | null {
  const availableInventory = inventory.filter(isIngredientActive);
  let bestMatch: (MatchedRecipeIngredientToInventory & { score: number }) | null = null;

  for (const inventoryIngredient of availableInventory) {
    const nameMatch = getIngredientNameMatch(recipeIngredient, inventoryIngredient);
    if (!nameMatch) {
      continue;
    }

    const hasRecipeQuantity = hasPositiveNumber(recipeIngredient.quantity);
    const hasRecipeUnit = typeof recipeIngredient.unit === 'string' && recipeIngredient.unit.length > 0;
    const unitMatches = hasRecipeUnit && recipeIngredient.unit === inventoryIngredient.unit;
    const recipeQuantity = hasRecipeQuantity ? (recipeIngredient.quantity as number) : 0;

    const score =
      nameMatch.score +
      (unitMatches ? 20 : 0) +
      (hasRecipeQuantity && inventoryIngredient.quantity >= recipeQuantity ? 10 : 0);

    const canAutoDeduct =
      hasRecipeQuantity &&
      hasRecipeUnit &&
      hasPositiveNumber(inventoryIngredient.quantity) &&
      unitMatches;

    const reason = canAutoDeduct
      ? undefined
      : !hasRecipeQuantity || !hasRecipeUnit
        ? 'no_quantity'
        : 'unit_mismatch';

    const candidateMatch: MatchedRecipeIngredientToInventory & { score: number } = {
      recipeIngredient,
      inventoryIngredient,
      matchedName: nameMatch.matchedName,
      matchType: nameMatch.matchType,
      canAutoDeduct,
      reason,
      score,
    };

    if (!bestMatch || candidateMatch.score > bestMatch.score) {
      bestMatch = candidateMatch;
    }
  }

  if (!bestMatch) {
    return null;
  }

  return {
    recipeIngredient: bestMatch.recipeIngredient,
    inventoryIngredient: bestMatch.inventoryIngredient,
    matchedName: bestMatch.matchedName,
    matchType: bestMatch.matchType,
    canAutoDeduct: bestMatch.canAutoDeduct,
    reason: bestMatch.reason,
  };
}

export function calculateRecipeDeduction(
  recipe: Recipe,
  inventory: Ingredient[]
): RecipeDeductionPlan {
  const deductibleItemsByInventoryId = new Map<string, RecipeDeductionItem>();
  const skippedItems: RecipeDeductionSkippedItem[] = [];
  const requiredIngredients = recipe.ingredients.filter((ingredient) => !ingredient.optional);
  let matchedRequiredIngredientCount = 0;

  recipe.ingredients.forEach((requirement) => {
    const match = matchRecipeIngredientToInventory(requirement, inventory);

    if (!match) {
      skippedItems.push(
        buildSkippedItem(
          requirement,
          requirement.optional ? 'optional_not_available' : 'missing'
        )
      );
      return;
    }

    if (!requirement.optional) {
      matchedRequiredIngredientCount += 1;
    }

    if (!match.canAutoDeduct) {
      skippedItems.push(
        buildSkippedItem(requirement, match.reason ?? 'no_quantity', match.inventoryIngredient)
      );
      return;
    }

    const existingItem = deductibleItemsByInventoryId.get(match.inventoryIngredient.id);
    const nextDeductionQuantity = Math.min(
      match.inventoryIngredient.quantity,
      (existingItem?.deductionQuantity ?? 0) + (requirement.quantity ?? 0)
    );

    const nextItem: RecipeDeductionItem = sanitizeDeductionItem({
      inventoryIngredientId: match.inventoryIngredient.id,
      inventoryIngredientName: match.inventoryIngredient.name,
      currentQuantity: match.inventoryIngredient.quantity,
      unit: match.inventoryIngredient.unit,
      deductionQuantity: nextDeductionQuantity,
      remainingQuantity: Math.max(
        0,
        match.inventoryIngredient.quantity - nextDeductionQuantity
      ),
      matchedRecipeIngredients: existingItem
        ? [...existingItem.matchedRecipeIngredients, buildLineItem(requirement)]
        : [buildLineItem(requirement)],
    });

    deductibleItemsByInventoryId.set(match.inventoryIngredient.id, nextItem);
  });

  const deductibleItems = [...deductibleItemsByInventoryId.values()].map(sanitizeDeductionItem);
  const allRequiredIngredientsMissing =
    requiredIngredients.length > 0 && matchedRequiredIngredientCount === 0;

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    deductibleItems,
    skippedItems,
    missingIngredients: skippedItems.filter((item) => item.reason === 'missing'),
    ingredientsWithoutQuantity: skippedItems.filter((item) => item.reason === 'no_quantity'),
    manualAdjustmentItems: skippedItems.filter((item) => item.reason === 'unit_mismatch'),
    requiredIngredientCount: requiredIngredients.length,
    matchedRequiredIngredientCount,
    allRequiredIngredientsMissing,
    canCook: !allRequiredIngredientsMissing,
  };
}

export function applyRecipeDeduction(
  deductionPlan: RecipeDeductionPlan,
  cookedAt = new Date().toISOString()
): AppliedRecipeDeduction {
  const ingredientPatches: IngredientQuantityPatch[] = [];
  const deductedItems: CookingHistory['deductedItems'] = [];

  deductionPlan.deductibleItems
    .map(sanitizeDeductionItem)
    .forEach((item) => {
      if (item.deductionQuantity <= 0) {
        return;
      }

      const remainingQuantity = Math.max(0, item.currentQuantity - item.deductionQuantity);
      ingredientPatches.push({
        id: item.inventoryIngredientId,
        quantity: remainingQuantity,
        status: remainingQuantity > 0 ? 'active' : 'used_up',
      });
      deductedItems.push({
        inventoryIngredientId: item.inventoryIngredientId,
        inventoryIngredientName: item.inventoryIngredientName,
        deductedQuantity: item.deductionQuantity,
        unit: item.unit,
        remainingQuantity,
      });
    });

  return {
    ingredientPatches,
    historyRecord: {
      id: createId('cooking-history'),
      recipeId: deductionPlan.recipeId,
      recipeName: deductionPlan.recipeName,
      cookedAt,
      deductedItems,
      skippedItems: deductionPlan.skippedItems.map((item) => ({
        recipeIngredientName: item.recipeIngredientName,
        reason: item.reason,
      })),
    },
  };
}

export function undoRecipeDeduction(historyRecord: CookingHistory): IngredientQuantityPatch[] {
  return historyRecord.deductedItems.map((item) => ({
    id: item.inventoryIngredientId,
    quantity: item.remainingQuantity + item.deductedQuantity,
    status: 'active',
  }));
}

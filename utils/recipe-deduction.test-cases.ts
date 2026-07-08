import type { Ingredient } from '@/types/ingredient';
import type { Recipe } from '@/types/recipe';
import {
  applyRecipeDeduction,
  calculateRecipeDeduction,
  undoRecipeDeduction,
} from '@/utils/recipe-deduction';

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function createIngredient(overrides: Partial<Ingredient>): Ingredient {
  return {
    id: overrides.id ?? 'ingredient-1',
    name: overrides.name ?? 'ไข่ไก่',
    category: overrides.category ?? 'protein',
    quantity: overrides.quantity ?? 1,
    unit: overrides.unit ?? 'item',
    purchasedAt: overrides.purchasedAt ?? '2026-07-08',
    expiresAt: overrides.expiresAt ?? null,
    note: overrides.note ?? null,
    status: overrides.status ?? 'active',
  };
}

function createRecipe(overrides: Partial<Recipe>): Recipe {
  return {
    id: overrides.id ?? 'recipe-1',
    name: overrides.name ?? 'ตัวอย่าง',
    isFavorite: overrides.isFavorite ?? false,
    description: overrides.description ?? '',
    ingredients: overrides.ingredients ?? [],
    instructions: overrides.instructions ?? ['ทำตามขั้นตอน'],
    prepMinutes: overrides.prepMinutes ?? 0,
    cookMinutes: overrides.cookMinutes ?? 10,
    servings: overrides.servings ?? 1,
    tags: overrides.tags ?? [],
    notes: overrides.notes,
    createdAt: overrides.createdAt ?? '2026-07-08T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-07-08T00:00:00.000Z',
  };
}

export function verifyRecipeDeductionTestCases() {
  const partialMatchPlan = calculateRecipeDeduction(
    createRecipe({
      name: 'อกไก่ผัดไข่',
      ingredients: [
        {
          id: 'recipe-ingredient-1',
          ingredientName: 'อกไก่',
          quantity: 250,
          unit: 'g',
        },
        {
          id: 'recipe-ingredient-2',
          ingredientName: 'ไข่ไก่',
          quantity: 1,
          unit: 'item',
        },
      ],
    }),
    [
      createIngredient({
        id: 'inventory-1',
        name: 'อกไก่บด',
        quantity: 300,
        unit: 'g',
      }),
      createIngredient({
        id: 'inventory-2',
        name: 'ไข่ไก่',
        quantity: 4,
        unit: 'item',
      }),
    ]
  );

  assertCondition(
    partialMatchPlan.deductibleItems.length === 2,
    'Expected partial match plan to auto-deduct both matched ingredients.'
  );

  const unitMismatchPlan = calculateRecipeDeduction(
    createRecipe({
      name: 'ข้าวคลุก',
      ingredients: [
        {
          id: 'recipe-ingredient-3',
          ingredientName: 'ข้าวกล้อง',
          quantity: 1,
          unit: 'item',
        },
      ],
    }),
    [
      createIngredient({
        id: 'inventory-3',
        name: 'ข้าวกล้อง',
        category: 'grains',
        quantity: 500,
        unit: 'g',
      }),
    ]
  );

  assertCondition(
    unitMismatchPlan.manualAdjustmentItems.length === 1,
    'Expected unit mismatch ingredients to be flagged for manual adjustment.'
  );

  const optionalMissingPlan = calculateRecipeDeduction(
    createRecipe({
      name: 'ไข่ตุ๋น',
      ingredients: [
        {
          id: 'recipe-ingredient-4',
          ingredientName: 'ไข่ไก่',
          quantity: 2,
          unit: 'item',
        },
        {
          id: 'recipe-ingredient-5',
          ingredientName: 'เห็ด',
          quantity: 50,
          unit: 'g',
          optional: true,
        },
      ],
    }),
    [
      createIngredient({
        id: 'inventory-4',
        name: 'ไข่ไก่',
        quantity: 6,
        unit: 'item',
      }),
    ]
  );

  assertCondition(
    optionalMissingPlan.canCook,
    'Expected missing optional ingredients not to block cooking.'
  );
  assertCondition(
    optionalMissingPlan.skippedItems.some((item) => item.reason === 'optional_not_available'),
    'Expected missing optional ingredients to be tracked separately.'
  );

  const usedUpPlan = calculateRecipeDeduction(
    createRecipe({
      name: 'ฟักทองอบ',
      ingredients: [
        {
          id: 'recipe-ingredient-6',
          ingredientName: 'ฟักทอง',
          quantity: 400,
          unit: 'g',
        },
      ],
    }),
    [
      createIngredient({
        id: 'inventory-5',
        name: 'ฟักทอง',
        category: 'produce',
        quantity: 300,
        unit: 'g',
      }),
    ]
  );

  const appliedDeduction = applyRecipeDeduction(usedUpPlan, '2026-07-08T01:00:00.000Z');
  assertCondition(
    appliedDeduction.ingredientPatches[0]?.quantity === 0,
    'Expected deduction to clamp at zero instead of creating negative stock.'
  );
  assertCondition(
    appliedDeduction.ingredientPatches[0]?.status === 'used_up',
    'Expected empty stock items to be marked as used up.'
  );

  const undoPatches = undoRecipeDeduction(appliedDeduction.historyRecord);
  assertCondition(
    undoPatches[0]?.quantity === 300 && undoPatches[0]?.status === 'active',
    'Expected undo to restore the previous quantity and active status.'
  );
}

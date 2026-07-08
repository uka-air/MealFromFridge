import type {
  IngredientCategory,
  IngredientUnit,
} from '@/types/ingredient';

export interface MockProduct {
  barcode: string;
  name: string;
  category: IngredientCategory;
  defaultUnit: IngredientUnit;
  suggestedShelfLifeDays: number | null;
  brand?: string;
}

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    barcode: '8850000000001',
    name: 'Milk',
    category: 'dairy',
    defaultUnit: 'pack',
    suggestedShelfLifeDays: 7,
  },
  {
    barcode: '8850000000002',
    name: 'Eggs',
    category: 'protein',
    defaultUnit: 'item',
    suggestedShelfLifeDays: 14,
  },
  {
    barcode: '8850000000003',
    name: 'Greek yogurt',
    category: 'dairy',
    defaultUnit: 'pack',
    suggestedShelfLifeDays: 10,
  },
  {
    barcode: '8850000000004',
    name: 'Cottage cheese',
    category: 'dairy',
    defaultUnit: 'pack',
    suggestedShelfLifeDays: 10,
  },
  {
    barcode: '8850000000005',
    name: 'Tofu',
    category: 'protein',
    defaultUnit: 'pack',
    suggestedShelfLifeDays: 5,
  },
  {
    barcode: '8850000000006',
    name: 'Canned tuna',
    category: 'pantry',
    defaultUnit: 'item',
    suggestedShelfLifeDays: 365,
  },
  {
    barcode: '8850000000007',
    name: 'Rice',
    category: 'grains',
    defaultUnit: 'kg',
    suggestedShelfLifeDays: 365,
  },
  {
    barcode: '8850000000008',
    name: 'Oats',
    category: 'grains',
    defaultUnit: 'pack',
    suggestedShelfLifeDays: 180,
  },
];

export function findMockProductByBarcode(barcode: string) {
  const trimmedBarcode = barcode.trim();
  if (!trimmedBarcode) {
    return null;
  }

  return MOCK_PRODUCTS.find((product) => product.barcode === trimmedBarcode) ?? null;
}

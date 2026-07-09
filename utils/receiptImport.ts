import type { Ingredient, IngredientCategory, IngredientUnit, IngredientUpdate } from '@/types/ingredient';
import type { ParsedReceiptItem, ReceiptReviewItem } from '@/types/receipt';
import { suggestExpiryDate } from '@/utils/expirySuggestion';
import { createId } from '@/utils/id';
import { isIngredientActive } from '@/utils/inventory';

const RECEIPT_UNIT_TO_INGREDIENT_UNIT: Record<string, IngredientUnit> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  cup: 'cup',
  cups: 'cup',
  tbsp: 'tbsp',
  tsp: 'tsp',
  oz: 'oz',
  lb: 'lb',
  pack: 'pack',
  packs: 'pack',
  item: 'item',
  items: 'item',
  pcs: 'item',
  pc: 'item',
  piece: 'item',
  pieces: 'item',
  ฟอง: 'item',
  ชิ้น: 'item',
  ขวด: 'item',
  กระป๋อง: 'item',
  ถ้วย: 'item',
  กล่อง: 'pack',
  ถุง: 'pack',
  ซอง: 'pack',
  แพ็ค: 'pack',
  แพค: 'pack',
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function appendReceiptNote(existingNote: string | null, rawLine: string) {
  const nextNote = rawLine.trim();
  if (!nextNote) {
    return existingNote;
  }

  if (!existingNote?.trim()) {
    return `Receipt: ${nextNote}`;
  }

  if (existingNote.includes(nextNote)) {
    return existingNote;
  }

  return `${existingNote}\nReceipt: ${nextNote}`;
}

function chooseMergedExpiryDate(existingExpiresAt: string | null, nextExpiresAt: string | null) {
  if (!existingExpiresAt) {
    return nextExpiresAt;
  }
  if (!nextExpiresAt) {
    return existingExpiresAt;
  }

  return existingExpiresAt <= nextExpiresAt ? existingExpiresAt : nextExpiresAt;
}

export function normalizeReceiptUnitToIngredientUnit(unit: string): IngredientUnit | null {
  const normalizedUnit = normalize(unit);
  return RECEIPT_UNIT_TO_INGREDIENT_UNIT[normalizedUnit] ?? null;
}

export function findDuplicateActiveIngredient(
  inventory: Ingredient[],
  name: string,
  unit: IngredientUnit
) {
  const normalizedName = normalize(name);

  return inventory.find(
    (ingredient) =>
      isIngredientActive(ingredient) &&
      normalize(ingredient.name) === normalizedName &&
      ingredient.unit === unit
  );
}

export function createReceiptReviewItem(
  item: ParsedReceiptItem,
  purchasedAt: string,
  fallbackCategory: IngredientCategory = 'other'
): ReceiptReviewItem {
  return {
    id: createId('receipt-review'),
    rawLine: item.rawLine,
    name: item.name,
    quantity: item.quantity !== undefined ? String(item.quantity) : '1',
    unit: item.unit ?? 'item',
    price: item.price,
    barcode: item.barcode,
    confidence: item.confidence,
    category: item.category ?? fallbackCategory,
    expiresAt: suggestExpiryDate(item, purchasedAt) ?? '',
    included: true,
    duplicateAction: 'ask',
  };
}

export function buildMergeIngredientUpdate(
  ingredient: Ingredient,
  reviewItem: ReceiptReviewItem,
  quantityToAdd: number,
  normalizedUnit: IngredientUnit,
  purchasedAt: string
): IngredientUpdate {
  return {
    quantity: ingredient.quantity + quantityToAdd,
    unit: normalizedUnit,
    purchasedAt,
    expiresAt: chooseMergedExpiryDate(ingredient.expiresAt, reviewItem.expiresAt || null),
    note: appendReceiptNote(ingredient.note, reviewItem.rawLine),
    source: ingredient.source ?? 'receipt',
    receiptRawLine: reviewItem.rawLine,
    price: reviewItem.price ?? ingredient.price ?? null,
  };
}

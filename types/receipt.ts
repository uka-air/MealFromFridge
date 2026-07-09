import type { IngredientCategory } from '@/types/ingredient';

export interface ParsedReceiptItem {
  rawLine: string;
  name: string;
  quantity?: number;
  unit?: string;
  price?: number;
  barcode?: string;
  confidence: number;
  category?: IngredientCategory;
}

export interface ParsedReceipt {
  storeName?: string;
  purchasedAt?: string;
  items: ParsedReceiptItem[];
  total?: number;
  rawText: string;
}

export type ReceiptDuplicateAction = 'ask' | 'merge' | 'separate' | 'skip';

export interface ReceiptReviewItem {
  id: string;
  rawLine: string;
  name: string;
  quantity: string;
  unit: string;
  price?: number;
  barcode?: string;
  confidence: number;
  category: IngredientCategory;
  expiresAt: string;
  included: boolean;
  duplicateAction: ReceiptDuplicateAction;
}

export interface ReceiptImportDraft {
  imageUri?: string;
  parsedReceipt: ParsedReceipt;
  purchasedAt: string;
  items: ReceiptReviewItem[];
}

export interface ReceiptImportHistory {
  id: string;
  importedAt: string;
  storeName?: string;
  purchasedAt?: string;
  imageUri?: string;
  rawText: string;
  addedIngredientIds: string[];
  skippedItems: ParsedReceiptItem[];
}

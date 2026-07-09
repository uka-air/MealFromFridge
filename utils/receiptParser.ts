import type { IngredientCategory } from '@/types/ingredient';
import type { ParsedReceipt, ParsedReceiptItem } from '@/types/receipt';
import { guessCategoryFromReceiptItemName } from '@/utils/expirySuggestion';

const FOOD_STOP_WORDS = [
  'subtotal',
  'sub total',
  'total',
  'vat',
  'change',
  'cashier',
  'cash',
  'visa',
  'mastercard',
  'member',
  'promotion',
  'promo',
  'discount',
  'payment',
  'thank you',
  'ยอดรวม',
  'รวมสุทธิ',
  'รวม',
  'ภาษี',
  'เงินทอน',
  'แคชเชียร์',
  'สมาชิก',
  'โปรโมชั่น',
  'ส่วนลด',
  'ชำระ',
  'รับเงิน',
  'แต้ม',
];

const RECEIPT_UNIT_ALIASES: Record<string, string> = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  กรัม: 'g',
  kg: 'kg',
  กก: 'kg',
  ml: 'ml',
  มล: 'ml',
  l: 'l',
  litre: 'l',
  liter: 'l',
  ลิตร: 'l',
  pack: 'pack',
  packs: 'pack',
  แพ็ค: 'pack',
  แพค: 'pack',
  ซอง: 'pack',
  ถุง: 'pack',
  กล่อง: 'pack',
  can: 'item',
  cans: 'item',
  กระป๋อง: 'item',
  bottle: 'item',
  bottles: 'item',
  ขวด: 'item',
  piece: 'item',
  pieces: 'item',
  pcs: 'item',
  pc: 'item',
  item: 'item',
  items: 'item',
  ฟอง: 'item',
  ชิ้น: 'item',
  ถ้วย: 'item',
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function clampConfidence(value: number) {
  return Math.max(0.1, Math.min(0.99, value));
}

function parseReceiptDate(line: string) {
  const dayFirstMatch = line.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (dayFirstMatch) {
    const day = Number(dayFirstMatch[1]);
    const month = Number(dayFirstMatch[2]);
    const year = Number(
      dayFirstMatch[3].length === 2 ? `20${dayFirstMatch[3]}` : dayFirstMatch[3]
    );

    if (day && month && year) {
      return `${year.toString().padStart(4, '0')}-${month
        .toString()
        .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }

  const yearFirstMatch = line.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
  if (!yearFirstMatch) {
    return null;
  }

  const year = Number(yearFirstMatch[1]);
  const month = Number(yearFirstMatch[2]);
  const day = Number(yearFirstMatch[3]);
  if (!day || !month || !year) {
    return null;
  }

  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function extractMoneyValues(line: string) {
  return [...line.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{2}))?/g)]
    .map((match) => {
      const whole = match[1].replace(/,/g, '');
      const decimal = match[2] ? `.${match[2]}` : '';
      return Number(`${whole}${decimal}`);
    })
    .filter((value) => Number.isFinite(value));
}

function extractPrice(line: string) {
  const values = extractMoneyValues(line);
  return values.length ? values[values.length - 1] : undefined;
}

function extractBarcode(line: string) {
  const match = line.match(/\b(\d{8,14})\b/);
  return match?.[1];
}

function normalizeReceiptUnit(unit?: string) {
  if (!unit) {
    return undefined;
  }

  const alias = RECEIPT_UNIT_ALIASES[normalize(unit)];
  return alias ?? unit;
}

function extractQuantityAndUnit(line: string) {
  const quantityWithUnitMatch = line.match(
    /(\d+(?:\.\d+)?)\s*(kg|g|gram|grams|ml|l|litre|liter|pack|packs|pcs|pc|item|items|กรัม|กก|มล|ลิตร|แพ็ค|แพค|ซอง|ถุง|กล่อง|กระป๋อง|ขวด|ชิ้น|ฟอง|ถ้วย)\b/i
  );
  if (quantityWithUnitMatch) {
    return {
      quantity: Number(quantityWithUnitMatch[1]),
      unit: normalizeReceiptUnit(quantityWithUnitMatch[2]),
    };
  }

  const trailingCountMatch = line.match(
    /(?:x|X)?\s*(\d+(?:\.\d+)?)\s*(ฟอง|ชิ้น|ถ้วย|pack|pcs|items?)\b/i
  );
  if (trailingCountMatch) {
    return {
      quantity: Number(trailingCountMatch[1]),
      unit: normalizeReceiptUnit(trailingCountMatch[2]),
    };
  }

  return {
    quantity: undefined,
    unit: undefined,
  };
}

function cleanProductName(line: string, quantity?: number, unit?: string, price?: number) {
  let cleaned = line
    .replace(/^\s*\d+\s+/, '')
    .replace(/\b\d{8,14}\b/g, '')
    .replace(
      /\b\d+(?:\.\d+)?\s*(kg|g|gram|grams|ml|l|litre|liter|pack|packs|pcs|pc|item|items|กรัม|กก|มล|ลิตร|แพ็ค|แพค|ซอง|ถุง|กล่อง|กระป๋อง|ขวด|ชิ้น|ฟอง|ถ้วย)\b/gi,
      ' '
    )
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (quantity !== undefined && unit) {
    const quantityUnitPattern = new RegExp(
      `${quantity}\\s*${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
      'i'
    );
    cleaned = cleaned.replace(quantityUnitPattern, ' ');
  }

  cleaned = cleaned.replace(/\b(?:x|X)\s*\d+(?:\.\d+)?\b/g, ' ');

  if (price !== undefined) {
    const pricePattern = new RegExp(`${price.toFixed(2).replace('.', '\\.')}$`);
    cleaned = cleaned.replace(pricePattern, ' ');
  }

  cleaned = cleaned.replace(/\d+\.\d{2}\s*$/g, ' ');
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned;
}

function isObviousNonFoodLine(line: string) {
  const normalizedLine = normalize(line);
  return FOOD_STOP_WORDS.some((word) => normalizedLine.includes(word));
}

function looksLikeStoreName(line: string, index: number) {
  return (
    index <= 1 &&
    /[A-Za-zก-๙]/.test(line) &&
    extractMoneyValues(line).length === 0 &&
    !parseReceiptDate(line)
  );
}

function looksFoodLike(name: string) {
  return /[A-Za-zก-๙]/.test(name) && name.trim().length >= 2;
}

function buildParsedItem(rawLine: string): ParsedReceiptItem | null {
  const price = extractPrice(rawLine);
  const barcode = extractBarcode(rawLine);
  const { quantity, unit } = extractQuantityAndUnit(rawLine);
  const name = cleanProductName(rawLine, quantity, unit, price);

  if (!looksFoodLike(name)) {
    return null;
  }

  const category = guessCategoryFromReceiptItemName(name);
  let confidence = 0.45;

  if (price !== undefined) {
    confidence += 0.2;
  }
  if (quantity !== undefined) {
    confidence += 0.15;
  }
  if (unit) {
    confidence += 0.05;
  }
  if (barcode) {
    confidence += 0.05;
  }
  if (category !== 'other') {
    confidence += 0.1;
  }
  if (name.length <= 3) {
    confidence -= 0.15;
  }

  return {
    rawLine,
    name,
    quantity,
    unit,
    price,
    barcode,
    confidence: clampConfidence(confidence),
    category,
  };
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items: ParsedReceiptItem[] = [];
  let storeName: string | undefined;
  let purchasedAt: string | undefined;
  let total: number | undefined;

  lines.forEach((line, index) => {
    if (!storeName && looksLikeStoreName(line, index)) {
      storeName = line;
      return;
    }

    if (!purchasedAt) {
      const parsedDate = parseReceiptDate(line);
      if (parsedDate) {
        purchasedAt = parsedDate;
      }
    }

    const normalizedLine = normalize(line);
    if (
      (normalizedLine.includes('total') || normalizedLine.includes('ยอดรวม') || normalizedLine.includes('รวมสุทธิ')) &&
      total === undefined
    ) {
      total = extractPrice(line);
    }

    if (isObviousNonFoodLine(line)) {
      return;
    }

    const parsedItem = buildParsedItem(line);
    if (parsedItem) {
      items.push(parsedItem);
    }
  });

  return {
    storeName,
    purchasedAt,
    items,
    total,
    rawText,
  };
}

export function categoryLabel(category?: IngredientCategory) {
  switch (category) {
    case 'produce':
      return 'ผักและผลไม้';
    case 'protein':
      return 'โปรตีน';
    case 'dairy':
      return 'นมและชีส';
    case 'grains':
      return 'ธัญพืช';
    case 'pantry':
      return 'ของแห้ง';
    case 'frozen':
      return 'แช่แข็ง';
    case 'spices':
      return 'เครื่องปรุง';
    default:
      return 'อื่น ๆ';
  }
}

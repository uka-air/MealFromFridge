import type { IngredientCategory } from '@/types/ingredient';
import type { ParsedReceipt, ParsedReceiptItem } from '@/types/receipt';
import { guessCategoryFromReceiptItemName } from '@/utils/expirySuggestion';

const FOOD_STOP_WORDS = [
  'subtotal',
  'sub total',
  'total',
  'vat',
  'vat included',
  'vat incl',
  'change',
  'cashier',
  'cash',
  'visa',
  'mastercard',
  'member',
  'branch',
  'receipt',
  'tax invoice',
  'tax:inv',
  'tax inv',
  'inv',
  'invoice / receipt',
  'tax id',
  'company',
  'co., ltd',
  'co. ltd',
  'limited',
  'สำนักงานใหญ่',
  'สาขา',
  'ใบกำกับภาษี',
  'ใบเสร็จรับเงิน',
  'ใบเสร็จ',
  'เลขประจำตัวผู้เสียภาษี',
  'vat included',
  'รวมภาษี',
  'ราคารวมภาษี',
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
  ก: 'g',
  kg: 'kg',
  กก: 'kg',
  กิโล: 'kg',
  กิโลกรัม: 'kg',
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

const RECEIPT_UNIT_PATTERN = Object.keys(RECEIPT_UNIT_ALIASES)
  .sort((left, right) => right.length - left.length)
  .map((unit) => unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const RECEIPT_UNIT_BOUNDARY_PATTERN = '(?=$|\\s|[xX×*]|[),.;:])';

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

function hasReceiptDate(line: string) {
  return parseReceiptDate(line) !== null;
}

function hasTimeValue(line: string) {
  return /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(line);
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
  const values = [...line.matchAll(/(?:^|\s)(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})(?=\s|$)/g)]
    .map((match) => Number(`${match[1].replace(/,/g, '')}.${match[2]}`))
    .filter((value) => Number.isFinite(value));

  return values.length ? values[values.length - 1] : undefined;
}

function hasReceiptStylePrice(line: string) {
  return /(?:^|\s)\d{1,3}(?:,\d{3})*\.\d{2}(?:\s|$)/.test(line);
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
    new RegExp(
      `(\\d+(?:\\.\\d+)?)\\s*(${RECEIPT_UNIT_PATTERN})${RECEIPT_UNIT_BOUNDARY_PATTERN}`,
      'i'
    )
  );
  if (quantityWithUnitMatch) {
    return {
      quantity: Number(quantityWithUnitMatch[1]),
      unit: normalizeReceiptUnit(quantityWithUnitMatch[2]),
    };
  }

  const trailingCountMatch = line.match(
    new RegExp(
      `(?:x|X)?\\s*(\\d+(?:\\.\\d+)?)\\s*(ฟอง|ชิ้น|ถ้วย|pack|packs|pcs|items?)${RECEIPT_UNIT_BOUNDARY_PATTERN}`,
      'i'
    )
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
      new RegExp(
        `\\b\\d+(?:\\.\\d+)?\\s*(${RECEIPT_UNIT_PATTERN})${RECEIPT_UNIT_BOUNDARY_PATTERN}`,
        'gi'
      ),
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

function looksLikeReceiptMetadataLine(line: string, index: number) {
  const normalizedLine = normalize(line);

  if (
    /^[#:]?\s*(branch|สาขา)\b/.test(normalizedLine) ||
    /(tax\s*:?\s*inv|tax invoice|invoice\/receipt|receipt no|receipt number|tax id|เลขที่ใบเสร็จ|เลขที่)\b/.test(
      normalizedLine
    )
  ) {
    return true;
  }

  if (
    (hasReceiptDate(line) || hasTimeValue(line)) &&
    extractMoneyValues(line).length <= 1 &&
    !extractQuantityAndUnit(line).unit
  ) {
    return true;
  }

  if (
    index <= 4 &&
    extractMoneyValues(line).length === 0 &&
    !extractQuantityAndUnit(line).unit &&
    /(company|co\.,?\s*ltd|limited|สำนักงานใหญ่|สาขา|tax invoice|receipt)/.test(
      normalizedLine
    )
  ) {
    return true;
  }

  return false;
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

function hasItemSignals(line: string) {
  const { quantity, unit } = extractQuantityAndUnit(line);
  return (
    hasReceiptStylePrice(line) ||
    quantity !== undefined ||
    unit !== undefined ||
    extractBarcode(line) !== undefined
  );
}

function isLikelyWrappedTailLine(line: string) {
  const normalizedLine = line.trim();
  if (!normalizedLine) {
    return false;
  }

  if (hasReceiptDate(line) || hasTimeValue(line) || isObviousNonFoodLine(line)) {
    return false;
  }

  const simpleTailPattern = new RegExp(
    `^(?:x|X)?\\s*\\d+(?:\\.\\d+)?(?:\\s*(?:${RECEIPT_UNIT_PATTERN})${RECEIPT_UNIT_BOUNDARY_PATTERN})?(?:\\s*[xX×*]\\s*\\d+(?:\\.\\d+)?)?(?:\\s+\\d+(?:\\.\\d{2})?)?$`,
    'i'
  );

  return simpleTailPattern.test(normalizedLine);
}

function mergeWrappedReceiptLines(lines: string[]) {
  const mergedLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    let currentLine = lines[index];

    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1];
      const shouldMerge =
        looksFoodLike(currentLine) &&
        extractPrice(currentLine) === undefined &&
        !isObviousNonFoodLine(currentLine) &&
        !looksLikeReceiptMetadataLine(currentLine, index) &&
        isLikelyWrappedTailLine(nextLine);

      if (!shouldMerge) {
        break;
      }

      currentLine = `${currentLine} ${nextLine}`.replace(/\s{2,}/g, ' ').trim();
      index += 1;
    }

    mergedLines.push(currentLine);
  }

  return mergedLines;
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

function looksLikeProbableItemLine(line: string, index: number) {
  if (isObviousNonFoodLine(line) || looksLikeReceiptMetadataLine(line, index)) {
    return false;
  }

  const parsedItem = buildParsedItem(line);
  if (!parsedItem) {
    return false;
  }

  return hasItemSignals(line);
}

function getItemSectionBounds(lines: string[]) {
  const firstItemIndex = lines.findIndex((line, index) =>
    looksLikeProbableItemLine(line, index)
  );

  if (firstItemIndex < 0) {
    return null;
  }

  let lastItemIndex = firstItemIndex;
  for (let index = lines.length - 1; index >= firstItemIndex; index -= 1) {
    if (looksLikeProbableItemLine(lines[index], index)) {
      lastItemIndex = index;
      break;
    }
  }

  return {
    firstItemIndex,
    lastItemIndex,
  };
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = mergeWrappedReceiptLines(
    rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  );

  const items: ParsedReceiptItem[] = [];
  let storeName: string | undefined;
  let purchasedAt: string | undefined;
  let total: number | undefined;
  const itemSectionBounds = getItemSectionBounds(lines);

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

    if (
      itemSectionBounds &&
      (index < itemSectionBounds.firstItemIndex || index > itemSectionBounds.lastItemIndex)
    ) {
      return;
    }

    if (isObviousNonFoodLine(line)) {
      return;
    }

    if (looksLikeReceiptMetadataLine(line, index)) {
      return;
    }

    if (!hasItemSignals(line)) {
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

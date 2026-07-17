import { parseReceiptText } from '@/utils/receiptParser';

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const THAI_RECEIPT_FIXTURE = `TOPS DAILY
สาขา อารีย์
09/07/2026 18:42
อกไก่บด 598g 89.00
เห็ดแชมปิญอง 200g 55.00
ไข่ไก่ 10 ฟอง 69.00
TOTAL 213.00
VAT 14.91
CASHIER A12`;

const ENGLISH_RECEIPT_FIXTURE = `Lotus's Go Fresh
2026-07-09 20:11
Greek Yogurt 2 cups 118.00
Canned Tuna 2 cans 78.00
Oats 1 pack 95.00
Subtotal 291.00
Payment Cash 300.00
Change 9.00`;

const GOOGLE_VISION_RECEIPT_FIXTURE = `TOPS DAILY
09/07/2026 18:42
อกไก่บด 598g 89.00
คอตเทจชีส 150g 129.00
ไข่ไก่ 10 ฟอง 69.00
ยอดรวม 287.00`;

const RECEIPT_METADATA_FIXTURE = `CP AXTRA PUBLIC COMPANY LIMITED
สาขา พระราม 9
TAX INVOICE / RECEIPT
VAT INCLUDED
วันที่ 09/07/2026 18:42
เลขประจำตัวผู้เสียภาษี 0123456789012
ไข่ไก่ 10 ฟอง 69.00
อกไก่บด 598g 89.00
ยอดรวมสุทธิ 158.00`;

const WRAPPED_ITEM_FIXTURE = `TOPS DAILY
09/07/2026 18:42
อกไก่บด
598g 89.00
ไข่ไก่
10 ฟอง 69.00
TOTAL 158.00`;

const THAI_COMPACT_UNIT_FIXTURE = `TOPS DAILY
09/07/2026 18:42
แฮมเบิร์สชีสซอสบาบีคิว 250กx1
ซูกินี 1 กก
TOTAL 0.00`;

export function verifyReceiptParserTestCases() {
  const thaiReceipt = parseReceiptText(THAI_RECEIPT_FIXTURE);
  assertCondition(
    thaiReceipt.storeName === 'TOPS DAILY',
    'Expected parser to detect Thai receipt store name.'
  );
  assertCondition(
    thaiReceipt.purchasedAt === '2026-07-09',
    'Expected parser to normalize Thai receipt purchase date.'
  );
  assertCondition(
    thaiReceipt.items.length === 3,
    'Expected parser to ignore VAT/total lines and keep only food items.'
  );
  assertCondition(
    thaiReceipt.items.some((item) => item.name.includes('อกไก่บด') && item.quantity === 598),
    'Expected parser to keep chicken item with quantity.'
  );

  const englishReceipt = parseReceiptText(ENGLISH_RECEIPT_FIXTURE);
  assertCondition(
    englishReceipt.items.length === 3,
    'Expected parser to keep English grocery items.'
  );
  assertCondition(
    englishReceipt.purchasedAt === '2026-07-09',
    'Expected parser to normalize English receipt purchase date.'
  );
  assertCondition(
    englishReceipt.items.some((item) => item.name.includes('Greek Yogurt') && item.price === 118),
    'Expected parser to extract price from English lines.'
  );
  assertCondition(
    !englishReceipt.items.some((item) => /payment|change/i.test(item.rawLine)),
    'Expected parser to exclude payment and change lines.'
  );

  const googleVisionReceipt = parseReceiptText(GOOGLE_VISION_RECEIPT_FIXTURE);
  assertCondition(
    googleVisionReceipt.items.length === 3,
    'Expected parser to keep real-OCR-style receipt items.'
  );
  assertCondition(
    googleVisionReceipt.items.some(
      (item) => item.name.includes('คอตเทจชีส') && item.price === 129
    ),
    'Expected parser to preserve OCR text lines from a Google Vision style receipt.'
  );

  const metadataReceipt = parseReceiptText(RECEIPT_METADATA_FIXTURE);
  assertCondition(
    metadataReceipt.items.length === 2,
    'Expected parser to ignore company, branch, date/time, VAT, and tax invoice metadata lines.'
  );
  assertCondition(
    !metadataReceipt.items.some((item) =>
      /company|branch|tax invoice|vat included|วันที่|เลขประจำตัวผู้เสียภาษี/i.test(
        item.rawLine
      )
    ),
    'Expected parser not to keep receipt metadata lines as ingredients.'
  );

  const wrappedItemReceipt = parseReceiptText(WRAPPED_ITEM_FIXTURE);
  assertCondition(
    wrappedItemReceipt.items.length === 2,
    'Expected parser to merge wrapped OCR lines into complete ingredient rows.'
  );
  assertCondition(
    wrappedItemReceipt.items.some(
      (item) => item.name.includes('อกไก่บด') && item.quantity === 598 && item.price === 89
    ),
    'Expected parser to merge product name with following quantity/price line.'
  );

  const thaiCompactUnitReceipt = parseReceiptText(THAI_COMPACT_UNIT_FIXTURE);
  assertCondition(
    thaiCompactUnitReceipt.items.length === 2,
    'Expected parser to keep Thai items that have quantity/unit text but no price.'
  );
  assertCondition(
    thaiCompactUnitReceipt.items.some(
      (item) =>
        item.name === 'แฮมเบิร์สชีสซอสบาบีคิว' &&
        item.quantity === 250 &&
        item.unit === 'g' &&
        item.price === undefined
    ),
    'Expected parser to split compact Thai gram text like 250กx1.'
  );
  assertCondition(
    thaiCompactUnitReceipt.items.some(
      (item) =>
        item.name === 'ซูกินี' &&
        item.quantity === 1 &&
        item.unit === 'kg' &&
        item.price === undefined
    ),
    'Expected parser to split spaced Thai kilogram text like 1 กก.'
  );
}

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
}

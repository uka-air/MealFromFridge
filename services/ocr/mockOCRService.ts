import type { OCRResult, OCRService } from '@/services/ocr/OCRService';

const SAMPLE_RECEIPTS = [
  `TOPS DAILY
สาขา อารีย์
09/07/2026 18:42
อกไก่บด 598g 89.00
เห็ดแชมปิญอง 200g 55.00
คอตเทจชีส 150g 129.00
ไข่ไก่ 10 ฟอง 69.00
ฟักทองญี่ปุ่น 500g 45.00
มันหวาน 225g 39.00
ข้าวกล้อง 1kg 79.00
SUBTOTAL 505.00
VAT 35.33
TOTAL 505.00
CASHIER A12`,
  `Lotus's Go Fresh
2026-07-09 20:11
กรีกโยเกิร์ต 2 ถ้วย 118.00
เต้าหู้แข็ง 1 แพ็ค 32.00
ทูน่ากระป๋อง 2 กระป๋อง 78.00
โอ๊ต 1 ถุง 95.00
แครอท 1 ถุง 24.00
ยอดรวม 347.00
ชำระเงินสด 500.00
เงินทอน 153.00`,
];

function pickReceiptText(imageUri: string) {
  if (imageUri.toLowerCase().includes('lotus')) {
    return SAMPLE_RECEIPTS[1];
  }

  return SAMPLE_RECEIPTS[0];
}

export const mockOCRService: OCRService = {
  async extractTextFromImage(imageUri: string): Promise<OCRResult> {
    if (!imageUri.trim()) {
      throw new Error('Image URI is required for OCR.');
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      rawText: pickReceiptText(imageUri),
      confidence: 0.86,
      provider: 'mock',
    };
  },
};

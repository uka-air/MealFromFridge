import { normalizeRemoteOCRResponse } from '@/services/ocr/remoteOCRService';

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function verifyRemoteOCRServiceTestCases() {
  const response = normalizeRemoteOCRResponse({
    rawText: 'TOPS DAILY\nไข่ไก่ 10 ฟอง 69.00',
    confidence: 0.92,
    provider: 'google_vision',
  });

  assertCondition(
    response.rawText.includes('ไข่ไก่'),
    'Expected remote OCR response normalization to keep backend rawText.'
  );
  assertCondition(
    response.provider === 'google_vision',
    'Expected remote OCR response normalization to preserve provider.'
  );
}

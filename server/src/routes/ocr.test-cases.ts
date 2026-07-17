import { validateReceiptOCRRequestBody } from './ocr';

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function verifyOCRRouteValidationTestCases() {
  let didRejectMissingImageBase64 = false;

  try {
    validateReceiptOCRRequestBody({});
  } catch {
    didRejectMissingImageBase64 = true;
  }

  assertCondition(
    didRejectMissingImageBase64,
    'Expected OCR route validation to reject a missing imageBase64 payload.'
  );
}

import type { PreparedReceiptImage } from '@/utils/prepareReceiptImage';

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertPreparedReceiptImage(result: PreparedReceiptImage) {
  assertCondition(
    typeof result.base64 === 'string' && result.base64.length > 0,
    'Expected prepared receipt image to contain base64 data.'
  );
  assertCondition(
    result.mimeType === 'image/jpeg' || result.mimeType === 'image/png',
    'Expected prepared receipt image to contain a supported mimeType.'
  );
}

export function verifyPrepareReceiptImageExampleCases() {
  assertPreparedReceiptImage({
    uri: 'file:///tmp/receipt.jpg',
    base64: 'ZmFrZS1yZWNlaXB0LWltYWdl',
    mimeType: 'image/jpeg',
  });
}

import type { protos } from '@google-cloud/vision';

import { buildGoogleVisionOCRResult } from './googleVisionOCR';

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function verifyGoogleVisionOCRServiceTestCases() {
  const response: protos.google.cloud.vision.v1.IAnnotateImageResponse = {
    fullTextAnnotation: {
      text: '',
    },
  };

  const result = buildGoogleVisionOCRResult(response);

  assertCondition(
    result.rawText === '',
    'Expected Google Vision OCR result shaping to allow an empty rawText response.'
  );
  assertCondition(
    result.provider === 'google_vision',
    'Expected Google Vision OCR result shaping to preserve the provider.'
  );
}

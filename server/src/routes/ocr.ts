import { Router } from 'express';

import { AppError } from '../middleware/errorHandler';
import { extractReceiptTextWithGoogleVision } from '../services/googleVisionOCR';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

type OCRMimeType = (typeof ALLOWED_MIME_TYPES)[number];

interface ReceiptOCRRequestBody {
  imageBase64: string;
  mimeType?: OCRMimeType;
}

function isAllowedMimeType(value: string): value is OCRMimeType {
  return ALLOWED_MIME_TYPES.includes(value as OCRMimeType);
}

function isLikelyBase64(value: string) {
  return /^[A-Za-z0-9+/=\s]+$/.test(value);
}

export function validateReceiptOCRRequestBody(body: unknown): ReceiptOCRRequestBody {
  if (!body || typeof body !== 'object') {
    throw new AppError(400, 'Request body is required.', 'invalid_request_body');
  }

  const record = body as Record<string, unknown>;
  const imageBase64 =
    typeof record.imageBase64 === 'string' ? record.imageBase64.trim() : '';
  const mimeType = typeof record.mimeType === 'string' ? record.mimeType.trim() : undefined;

  if (!imageBase64) {
    throw new AppError(400, 'imageBase64 is required.', 'missing_image_base64');
  }

  if (!isLikelyBase64(imageBase64)) {
    throw new AppError(400, 'imageBase64 must be valid base64 text.', 'invalid_image_base64');
  }

  if (mimeType && !isAllowedMimeType(mimeType)) {
    throw new AppError(400, 'mimeType must be image/jpeg or image/png.', 'invalid_mime_type');
  }

  return {
    imageBase64,
    mimeType: mimeType && isAllowedMimeType(mimeType) ? mimeType : undefined,
  };
}

export const ocrRouter = Router();

ocrRouter.post('/receipt', async (request, response, next) => {
  try {
    const { imageBase64 } = validateReceiptOCRRequestBody(request.body);
    const result = await extractReceiptTextWithGoogleVision(imageBase64);

    response.json(result);
  } catch (error) {
    next(error);
  }
});

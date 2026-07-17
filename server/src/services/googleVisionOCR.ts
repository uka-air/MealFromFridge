import fs from 'node:fs';

import vision, { protos } from '@google-cloud/vision';

import { AppError } from '../middleware/errorHandler';

const OCR_TIMEOUT_MS = 15_000;

export interface GoogleVisionOCRResult {
  rawText: string;
  confidence?: number;
  provider: 'google_vision';
}

type GoogleVisionClient = InstanceType<typeof vision.ImageAnnotatorClient>;

let googleVisionClient: GoogleVisionClient | null = null;

function getGoogleVisionClient() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!credentialsPath) {
    throw new AppError(
      500,
      'Google Vision credentials are not configured.',
      'google_vision_credentials_missing'
    );
  }

  if (!fs.existsSync(credentialsPath)) {
    throw new AppError(
      500,
      'Google Vision credentials file was not found.',
      'google_vision_credentials_not_found'
    );
  }

  if (!googleVisionClient) {
    googleVisionClient = new vision.ImageAnnotatorClient();
  }

  return googleVisionClient;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new AppError(504, 'OCR request timed out.', 'ocr_timeout'));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

function roundConfidence(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return null;
}

function mapGoogleVisionError(error: unknown) {
  const message = toErrorMessage(error);
  const normalizedMessage = message?.toLowerCase() ?? '';

  if (
    normalizedMessage.includes('permission denied') ||
    normalizedMessage.includes('permission_denied')
  ) {
    return new AppError(
      500,
      message ?? 'Google Vision permission denied.',
      'google_vision_permission_denied'
    );
  }

  if (
    normalizedMessage.includes('api has not been used') ||
    normalizedMessage.includes('is disabled') ||
    normalizedMessage.includes('enable it by visiting')
  ) {
    return new AppError(
      500,
      message ?? 'Vision API is not enabled for this Google Cloud project.',
      'google_vision_api_disabled'
    );
  }

  if (
    normalizedMessage.includes('billing') &&
    (normalizedMessage.includes('disabled') || normalizedMessage.includes('not enabled'))
  ) {
    return new AppError(
      500,
      message ?? 'Google Cloud billing is not enabled for this project.',
      'google_vision_billing_disabled'
    );
  }

  if (
    normalizedMessage.includes('could not load the default credentials') ||
    normalizedMessage.includes('invalid_grant') ||
    normalizedMessage.includes('invalid credential') ||
    normalizedMessage.includes('unsupported credential type')
  ) {
    return new AppError(
      500,
      message ?? 'Google Vision credentials are invalid.',
      'google_vision_invalid_credentials'
    );
  }

  return new AppError(
    500,
    message ?? 'Google Vision OCR failed.',
    'google_vision_error'
  );
}

export function getTextAnnotationConfidence(
  annotation?: protos.google.cloud.vision.v1.ITextAnnotation | null
) {
  const confidences: number[] = [];

  annotation?.pages?.forEach((page) => {
    page.blocks?.forEach((block) => {
      block.paragraphs?.forEach((paragraph) => {
        paragraph.words?.forEach((word) => {
          if (typeof word.confidence === 'number') {
            confidences.push(word.confidence);
          }
        });
      });
    });
  });

  if (!confidences.length) {
    return undefined;
  }

  const totalConfidence = confidences.reduce((sum, value) => sum + value, 0);
  return roundConfidence(totalConfidence / confidences.length);
}

export function buildGoogleVisionOCRResult(
  result: protos.google.cloud.vision.v1.IAnnotateImageResponse
): GoogleVisionOCRResult {
  const rawText =
    result.fullTextAnnotation?.text?.trim() ??
    result.textAnnotations?.[0]?.description?.trim() ??
    '';

  return {
    rawText,
    confidence: getTextAnnotationConfidence(result.fullTextAnnotation),
    provider: 'google_vision',
  };
}

export async function extractReceiptTextWithGoogleVision(
  imageBase64: string
): Promise<GoogleVisionOCRResult> {
  try {
    const [result] = await withTimeout<[protos.google.cloud.vision.v1.IAnnotateImageResponse]>(
      getGoogleVisionClient().documentTextDetection({
        image: {
          content: imageBase64,
        },
      }) as Promise<[protos.google.cloud.vision.v1.IAnnotateImageResponse]>,
      OCR_TIMEOUT_MS
    );

    if (result.error?.message) {
      throw new AppError(500, result.error.message, 'google_vision_error');
    }

    return buildGoogleVisionOCRResult(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error('[ocr-server] google vision error', error);
    throw mapGoogleVisionError(error);
  }
}

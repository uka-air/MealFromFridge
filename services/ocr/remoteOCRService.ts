import Constants from 'expo-constants';

import type { OCRResult, OCRService } from '@/services/ocr/OCRService';
import { OCRServiceError } from '@/services/ocr/OCRService';
import { prepareReceiptImage } from '@/utils/prepareReceiptImage';

const DEFAULT_TIMEOUT_MS = 15_000;

interface RemoteOCRResponse {
  rawText: string;
  confidence?: number;
  provider: 'google_vision';
}

function isLoopbackHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function parseHostCandidate(candidate: string) {
  try {
    return new URL(candidate.includes('://') ? candidate : `http://${candidate}`);
  } catch {
    return null;
  }
}

function getDevelopmentHostName() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.platform?.hostUri,
  ];

  for (const candidate of candidates) {
    if (!candidate?.trim()) {
      continue;
    }

    const parsedCandidate = parseHostCandidate(candidate.trim());
    if (parsedCandidate?.hostname) {
      return parsedCandidate.hostname;
    }
  }

  return null;
}

export function resolveRemoteOCREndpoint() {
  const endpoint = process.env.EXPO_PUBLIC_OCR_ENDPOINT?.trim();

  if (!endpoint) {
    throw new OCRServiceError(
      'config',
      'EXPO_PUBLIC_OCR_ENDPOINT is required when OCR provider is remote.',
      { provider: 'remote' }
    );
  }

  const parsedEndpoint = parseHostCandidate(endpoint);
  if (!parsedEndpoint) {
    return endpoint;
  }

  if (!__DEV__ || !isLoopbackHostname(parsedEndpoint.hostname)) {
    return parsedEndpoint.toString();
  }

  const developmentHostName = getDevelopmentHostName();
  if (!developmentHostName || isLoopbackHostname(developmentHostName)) {
    return parsedEndpoint.toString();
  }

  parsedEndpoint.hostname = developmentHostName;
  return parsedEndpoint.toString();
}

function getRemoteOCREndpoint() {
  const endpoint = resolveRemoteOCREndpoint();
  return endpoint;
}

function isRemoteOCRResponse(value: unknown): value is RemoteOCRResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.rawText === 'string' &&
    record.provider === 'google_vision' &&
    (record.confidence === undefined || typeof record.confidence === 'number')
  );
}

export function normalizeRemoteOCRResponse(value: unknown): RemoteOCRResponse {
  if (!isRemoteOCRResponse(value)) {
    throw new OCRServiceError(
      'server',
      'OCR server response is invalid.',
      { provider: 'remote' }
    );
  }

  return value;
}

async function parseErrorResponse(response: Response) {
  try {
    return (await response.json()) as { message?: string };
  } catch {
    return null;
  }
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

function isLikelyNetworkError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return [
    'network request failed',
    'failed to fetch',
    'fetch failed',
    'load failed',
    'connection refused',
    'cleartext',
    'econnrefused',
    'enotfound',
    'networkerror',
  ].some((pattern) => normalizedMessage.includes(pattern));
}

function createHTTPError(response: Response, message?: string) {
  const fallbackMessage = response.status === 413
    ? 'Receipt image is too large.'
    : response.status === 504
      ? 'OCR request timed out.'
      : response.status === 400
        ? 'Receipt image is invalid.'
        : 'OCR request failed.';

  const code =
    response.status === 400
      ? 'invalid_image'
      : response.status === 413 || response.status === 504
        ? 'timeout'
        : 'server';

  return new OCRServiceError(code, message ?? fallbackMessage, {
    provider: 'remote',
    status: response.status,
  });
}

export const remoteOCRService: OCRService = {
  async extractTextFromImage(imageUri: string): Promise<OCRResult> {
    if (!imageUri.trim()) {
      throw new OCRServiceError(
        'invalid_image',
        'Image URI is required for OCR.',
        { provider: 'remote' }
      );
    }

    const preparedImage = await prepareReceiptImage(imageUri);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(getRemoteOCREndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: preparedImage.base64,
          mimeType: preparedImage.mimeType,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorPayload = await parseErrorResponse(response);
        throw createHTTPError(response, errorPayload?.message);
      }

      const payload = normalizeRemoteOCRResponse(await response.json());
      if (!payload.rawText.trim()) {
        throw new OCRServiceError(
          'empty',
          'OCR completed but no receipt text was found.',
          { provider: payload.provider }
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof OCRServiceError) {
        throw error;
      }

      const errorMessage = toErrorMessage(error);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new OCRServiceError(
          'timeout',
          'OCR request timed out.',
          { provider: 'remote', status: 504 }
        );
      }

      if (
        error instanceof TypeError ||
        (errorMessage !== null && isLikelyNetworkError(errorMessage))
      ) {
        throw new OCRServiceError(
          'network',
          errorMessage ?? 'Could not reach the OCR server.',
          { provider: 'remote' }
        );
      }

      if (error instanceof SyntaxError) {
        throw new OCRServiceError(
          'server',
          'OCR server returned invalid JSON.',
          { provider: 'remote' }
        );
      }

      throw new OCRServiceError(
        'unknown',
        errorMessage ?? 'Unexpected OCR error.',
        { provider: 'remote' }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

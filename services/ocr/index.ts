import type { OCRServiceMode } from '@/services/ocr/OCRService';
import { mockOCRService } from '@/services/ocr/mockOCRService';
import {
  remoteOCRService,
  resolveRemoteOCREndpoint,
} from '@/services/ocr/remoteOCRService';

const configuredProvider = process.env.EXPO_PUBLIC_OCR_PROVIDER?.trim();

export const ocrServiceMode: OCRServiceMode =
  configuredProvider === 'remote' ? 'remote' : 'mock';

export const isRemoteOCRProvider = ocrServiceMode === 'remote';

export const ocrService = isRemoteOCRProvider
  ? remoteOCRService
  : mockOCRService;

export const remoteOCRDebugEndpoint = isRemoteOCRProvider
  ? resolveRemoteOCREndpoint()
  : null;

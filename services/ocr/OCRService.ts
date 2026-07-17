export type OCRProvider = 'mock' | 'google_vision';
export type OCRServiceMode = 'mock' | 'remote';

export interface OCRResult {
  rawText: string;
  confidence?: number;
  provider?: OCRProvider;
}

export interface OCRService {
  extractTextFromImage: (imageUri: string) => Promise<OCRResult>;
}

export type OCRServiceErrorCode =
  | 'config'
  | 'invalid_image'
  | 'network'
  | 'server'
  | 'timeout'
  | 'empty'
  | 'unknown';

interface OCRServiceErrorOptions {
  provider?: OCRProvider | OCRServiceMode;
  status?: number;
}

export class OCRServiceError extends Error {
  code: OCRServiceErrorCode;
  provider?: OCRProvider | OCRServiceMode;
  status?: number;

  constructor(
    code: OCRServiceErrorCode,
    message: string,
    options?: OCRServiceErrorOptions
  ) {
    super(message);
    this.name = 'OCRServiceError';
    this.code = code;
    this.provider = options?.provider;
    this.status = options?.status;
  }
}

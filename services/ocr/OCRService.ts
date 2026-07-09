export interface OCRResult {
  rawText: string;
  confidence?: number;
}

export interface OCRService {
  extractTextFromImage: (imageUri: string) => Promise<OCRResult>;
}

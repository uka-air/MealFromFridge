import { Image } from 'react-native';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { OCRServiceError } from '@/services/ocr/OCRService';

const MAX_RECEIPT_IMAGE_WIDTH = 1600;
const RECEIPT_IMAGE_COMPRESSION = 0.8;

export interface PreparedReceiptImage {
  uri: string;
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
}

export function getReceiptResizeWidth(width: number) {
  if (!Number.isFinite(width) || width <= 0) {
    throw new OCRServiceError('invalid_image', 'Image width is invalid.');
  }

  return Math.min(Math.round(width), MAX_RECEIPT_IMAGE_WIDTH);
}

function getImageSize(imageUri: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      imageUri,
      (width, height) => resolve({ width, height }),
      () =>
        reject(
          new OCRServiceError(
            'invalid_image',
            'Could not read the selected receipt image.'
          )
        )
    );
  });
}

export async function prepareReceiptImage(
  imageUri: string
): Promise<PreparedReceiptImage> {
  if (!imageUri.trim()) {
    throw new OCRServiceError('invalid_image', 'Image URI is required.');
  }

  try {
    const { width } = await getImageSize(imageUri);
    const context = ImageManipulator.manipulate(imageUri);
    const targetWidth = getReceiptResizeWidth(width);

    if (targetWidth < width) {
      context.resize({ width: targetWidth });
    }

    const renderedImage = await context.renderAsync();
    const savedImage = await renderedImage.saveAsync({
      compress: RECEIPT_IMAGE_COMPRESSION,
      format: SaveFormat.JPEG,
    });

    const base64 = await readAsStringAsync(savedImage.uri, {
      encoding: EncodingType.Base64,
    });
    if (!base64.trim()) {
      throw new OCRServiceError(
        'invalid_image',
        'Receipt image could not be converted for upload.'
      );
    }

    return {
      uri: savedImage.uri,
      base64,
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    if (error instanceof OCRServiceError) {
      throw error;
    }

    throw new OCRServiceError(
      'invalid_image',
      'Receipt image preparation failed.'
    );
  }
}

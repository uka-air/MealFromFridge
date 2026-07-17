import type { ErrorRequestHandler } from 'express';

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, message: string, code: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
      code: error.code,
    });
    return;
  }

  const payloadTooLargeError =
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    (error as { type?: unknown }).type === 'entity.too.large';

  if (payloadTooLargeError) {
    response.status(413).json({
      message: 'Receipt image is too large.',
      code: 'payload_too_large',
    });
    return;
  }

  console.error('[ocr-server] unexpected error', error);

  response.status(500).json({
    message: 'OCR provider error.',
    code: 'internal_server_error',
  });
};

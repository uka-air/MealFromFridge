import cors from 'cors';
import express from 'express';

import { loadServerEnv } from './config/loadEnv';
import { AppError, errorHandler } from './middleware/errorHandler';
import { ocrRouter } from './routes/ocr';

loadServerEnv();

function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getPort() {
  const port = Number(process.env.PORT ?? '4000');
  return Number.isFinite(port) && port > 0 ? port : 4000;
}

const allowedOrigins = getAllowedOrigins();
const app = express();

app.disable('x-powered-by');
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || process.env.NODE_ENV !== 'production') {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new AppError(403, 'Origin is not allowed.', 'origin_not_allowed'));
    },
  })
);
app.use(
  express.json({
    limit: '10mb',
  })
);

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
  });
});

app.use('/ocr', ocrRouter);
app.use(errorHandler);

app.listen(getPort(), () => {
  console.log(`[ocr-server] listening on port ${getPort()}`);
});

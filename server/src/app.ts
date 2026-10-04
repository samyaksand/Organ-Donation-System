import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiV1 } from './routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Behind a reverse proxy in production: needed for correct client IPs (rate limiting) and secure cookies.
  if (env.isProduction) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Same-origin / non-browser requests have no Origin header.
        if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api/v1', apiV1);
  app.use('/api', notFoundHandler);

  // Optional single-origin deployment: serve the built SPA when it exists.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (env.isProduction && fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

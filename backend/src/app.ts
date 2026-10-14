import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOrigins, type Env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/authRoutes';
import { campaignRoutes } from './routes/campaignRoutes';
import { submissionRoutes } from './routes/submissionRoutes';

export type AppConfig = Pick<Env, 'NODE_ENV' | 'JWT_SECRET' | 'JWT_EXPIRES_IN' | 'CORS_ORIGIN'>;

/** Builds the Express app without starting a server, so tests can use it directly. */
export function createApp(config: AppConfig): Express {
  const app = express();
  const jwt = { secret: config.JWT_SECRET, expiresIn: config.JWT_EXPIRES_IN };
  const isTest = config.NODE_ENV === 'test';

  app.set('trust proxy', 1); // Render/Vercel sit behind one proxy; needed for correct client IPs.
  app.use(helmet());
  app.use(cors({ origin: corsOrigins(config), methods: ['GET', 'POST', 'PATCH'] }));
  app.use(express.json({ limit: '20kb' }));
  if (!isTest) app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });
  app.use('/api/auth', authRoutes(jwt, !isTest));
  app.use('/api/campaigns', campaignRoutes(jwt.secret));
  app.use('/api/submissions', submissionRoutes(jwt.secret));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

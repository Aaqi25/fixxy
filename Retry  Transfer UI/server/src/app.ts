import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { authRoutes } from './modules/auth/auth.routes';
import { profileRoutes } from './modules/profile/profile.routes';
import { curriculumRoutes } from './modules/curriculum/curriculum.routes';
import { questionRoutes } from './modules/questions/question.routes';
import { attemptRoutes } from './modules/attempts/attempt.routes';
import { sessionRoutes } from './modules/sessions/session.routes';
import { requireAuth } from './modules/auth/auth.middleware';
import { errorHandler } from './middleware/errorHandler';
import { checkDbHealth } from './config/db';

export function createApp(): express.Application {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [env.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  // Health check
  app.get('/api/health', async (_req: Request, res: Response) => {
    const db = await checkDbHealth();
    res.status(db.ok ? 200 : 503).json({
      status: db.ok ? 'healthy' : 'degraded',
      modules: [
        'Module 1 — Authentication',
        'Module 2 — Student Profile',
        'Module 3 — Curriculum',
        'Module 4 — Question Engine',
        'Module 5 — Answer Submission',
        'Module 6 — Retry / Transfer UI',
      ],
      database: db,
      timestamp: new Date().toISOString(),
    });
  });

  // Authentication API routes (Module 1)
  app.use('/api/auth', authRoutes);

  // Student Profile API routes (Module 2)
  app.use('/api/profile', profileRoutes);

  // Curriculum API routes (Module 3)
  app.use('/api/curriculum', curriculumRoutes);

  // Question Engine API routes (Module 4)
  app.use('/api/questions', questionRoutes);

  // Answer Submission API routes (Module 5)
  app.use('/api/attempts', attemptRoutes);

  // Learning Session & Orchestration API routes (Module 6 & Module 8)
  app.use('/api/sessions', sessionRoutes);


  // Protected route verification endpoint (for testing and integration verification)
  app.get('/api/protected/ping', requireAuth, (req: Request, res: Response) => {
    res.status(200).json({
      message: 'Protected resource accessed successfully',
      studentId: req.user?.studentId,
      studentName: req.user?.name,
      studentEmail: req.user?.email,
    });
  });

  // 404 handler for API routes
  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ message: 'API route not found' });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../modules/auth/auth.service';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // OrchestrationError from Module 8
  if ((err as any).name === 'OrchestrationError' || (err as any).code?.startsWith?.('VALIDATION') || (err as any).code?.startsWith?.('AUTH') || (err as any).code?.startsWith?.('FORBIDDEN') || (err as any).code?.startsWith?.('NOT_FOUND') || (err as any).code?.startsWith?.('CONFLICT') || (err as any).code?.startsWith?.('AI_SERVICE')) {
    const status = (err as any).statusCode || 500;
    res.status(status).json({
      message: err.message,
      code: (err as any).code,
      error: {
        code: (err as any).code,
        message: err.message,
      },
      ...((err as any).details ? { details: (err as any).details } : {}),
    });
    return;
  }

  // Operational AppError (e.g. 400 Bad Request, 401 Unauthorized, 409 Conflict)
  if (err instanceof AppError || (err as any).statusCode) {
    const status = (err as any).statusCode || 400;
    res.status(status).json({
      message: err.message,
      ...(err as any).errors ? { errors: (err as any).errors } : {},
    });
    return;
  }

  // PostgreSQL duplicate key violation
  if ((err as any).code === '23505') {
    res.status(409).json({
      message: 'Email is already registered',
    });
    return;
  }

  // Unhandled / server errors: Never leak stack traces to the client
  console.error('[Unhandled Server Error]:', err);

  res.status(500).json({
    message: 'An unexpected error occurred. Please try again later.',
  });
}

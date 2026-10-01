import { Request, Response, NextFunction } from 'express';
import { AppError } from '../modules/auth/auth.service';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Operational AppError (e.g. 400 Bad Request, 401 Unauthorized, 409 Conflict)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
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

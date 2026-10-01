import { Request, Response, NextFunction } from 'express';
import { AppError } from '../modules/auth/auth.service';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Operational AppError / Custom Error with statusCode (400, 401, 403, 404, 409, etc.)
  const statusCode = (err as any).statusCode || (err instanceof AppError ? err.statusCode : null);
  if (statusCode) {
    res.status(statusCode).json({
      message: err.message,
      error: err.message,
      ...((err as any).errors ? { errors: (err as any).errors } : {}),
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

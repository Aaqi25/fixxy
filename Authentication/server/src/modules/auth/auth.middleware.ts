import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { authService, UnauthorizedError } from './auth.service';
import { AuthTokenPayload } from './auth.types';

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/**
 * Extracts the JWT authentication token from HttpOnly cookie or Authorization Bearer header.
 */
export function extractToken(req: Request): string | null {
  // 1. Check HttpOnly cookie (primary for FIXXY browser client)
  if (req.cookies && req.cookies[env.cookieName]) {
    return req.cookies[env.cookieName];
  }

  // 2. Check Authorization: Bearer <token> (fallback for API / testing)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * requireAuth middleware:
 * Validates presence and signature of JWT, extracts studentId, and attaches identity to req.user.
 * Rejects missing, invalid, or expired tokens with 401 Unauthorized.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = authService.verifyToken(token);
    if (!payload || !payload.studentId) {
      throw new UnauthorizedError('Invalid authentication token');
    }

    // Attach authenticated identity to req.user
    req.user = {
      studentId: payload.studentId,
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch (error) {
    next(error);
  }
}

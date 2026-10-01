import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { authService, UnauthorizedError } from './auth.service';
import {
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RegisterResponse,
} from './auth.types';

export class AuthController {
  /**
   * POST /api/auth/register
   * Registers a new student and returns safe student data.
   */
  async register(
    req: Request,
    res: Response<RegisterResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const student = await authService.register(req.body);
      res.status(201).json({
        message: 'Registration successful',
        student,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Authenticates student, sets HttpOnly cookie, and returns safe student data.
   */
  async login(
    req: Request,
    res: Response<LoginResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { student, token } = await authService.login(req.body);

      // Set secure HttpOnly cookie
      res.cookie(env.cookieName, token, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'lax',
        maxAge: env.cookieMaxAgeMs,
        path: '/',
      });

      res.status(200).json({
        message: 'Login successful',
        student,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Protected endpoint: returns current authenticated student info.
   */
  async me(
    req: Request,
    res: Response<MeResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.studentId) {
        throw new UnauthorizedError('Authentication required');
      }

      const student = await authService.getStudentById(req.user.studentId);
      res.status(200).json({
        student,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Clears the authentication cookie.
   */
  async logout(
    _req: Request,
    res: Response<LogoutResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      res.clearCookie(env.cookieName, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'lax',
        path: '/',
      });

      res.status(200).json({
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

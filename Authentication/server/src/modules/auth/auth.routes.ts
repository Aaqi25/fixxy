import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from './auth.middleware';

const router = Router();

// Public routes
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// Protected route
router.get('/me', requireAuth, (req, res, next) => authController.me(req, res, next));

export const authRoutes = router;

import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { profileController } from './profile.controller';

export const profileRoutes = Router();

// Both endpoints are protected by requireAuth
profileRoutes.get('/', requireAuth, profileController.getProfile);
profileRoutes.put('/', requireAuth, profileController.updateProfile);

import { Request, Response, NextFunction } from 'express';
import { profileService, ProfileService } from './profile.service';
import { UnauthorizedError } from '../auth/auth.service';

export class ProfileController {
  constructor(private readonly service: ProfileService = profileService) {}

  /**
   * GET /api/profile
   * Returns authenticated student's profile.
   * Uses req.user.studentId. Safe default profile created if none exists.
   */
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw new UnauthorizedError('Authentication required');
      }

      const defaultName = req.user?.name ?? 'Student';
      const profile = await this.service.getProfile(studentId, defaultName);

      res.status(200).json({ profile });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/profile
   * Updates authenticated student's profile.
   * Student identity is strictly taken from req.user.studentId.
   */
  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw new UnauthorizedError('Authentication required');
      }

      const profile = await this.service.updateProfile(studentId, req.body);

      res.status(200).json({
        message: 'Profile updated successfully',
        profile,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const profileController = new ProfileController();

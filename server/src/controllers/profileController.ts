import { Response, NextFunction } from 'express';
import { profileService } from '../services/profileService.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class ProfileController {
  // Profiles (User Accounts)
  async getAllProfiles(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profiles = await profileService.getAllProfiles();
      res.status(200).json({
        success: true,
        message: 'تم جلب الحسابات بنجاح',
        data: profiles,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await profileService.getProfileById(req.user!.id);
      res.status(200).json({
        success: true,
        message: 'تم جلب بيانات الحساب الحالي بنجاح',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfileById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const profile = await profileService.getProfileById(id);
      res.status(200).json({
        success: true,
        message: 'تم جلب بيانات الحساب بنجاح',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const profile = await profileService.updateProfile(id, req.body, req.user!.id);
      res.status(200).json({
        success: true,
        message: 'تم تحديث بيانات الحساب بنجاح',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await profileService.createUser(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: 'تم إنشاء حساب مستخدم جديد بنجاح',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      await profileService.deactivateUser(id, req.user!.id);
      res.status(200).json({
        success: true,
        message: 'تم تعطيل الحساب بنجاح',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async activateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      await profileService.activateUser(id, req.user!.id);
      res.status(200).json({
        success: true,
        message: 'تم تفعيل الحساب بنجاح',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  // Settings
  async getSettings(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await profileService.getSettings();
      res.status(200).json({
        success: true,
        message: 'تم جلب الإعدادات بنجاح',
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await profileService.updateSettings(req.body, req.user!.id);
      res.status(200).json({
        success: true,
        message: 'تم تحديث الإعدادات بنجاح',
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  // Notifications
  async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query['limit'] ? Number(req.query['limit']) : 20;
      const notifications = await profileService.getNotifications(req.user!.id, limit);
      const unreadCount = await profileService.getUnreadNotificationsCount(req.user!.id);
      res.status(200).json({
        success: true,
        message: 'تم جلب الإشعارات بنجاح',
        data: { notifications, unreadCount },
      });
    } catch (error) {
      next(error);
    }
  }

  async markNotificationRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await profileService.markNotificationRead(Number(id));
      res.status(200).json({
        success: true,
        message: 'تم تعيين الإشعار كمقروء',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllNotificationsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await profileService.markAllNotificationsRead(req.user!.id);
      res.status(200).json({
        success: true,
        message: 'تم تعيين جميع الإشعارات كمقروءة',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  // Activity Logs
  async getActivityLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query['page'] ? Number(req.query['page']) : 1;
      const pageSize = req.query['pageSize'] ? Number(req.query['pageSize']) : 20;
      const data = await profileService.getActivityLogs(page, pageSize);
      res.status(200).json({
        success: true,
        message: 'تم جلب سجل النشاطات بنجاح',
        data: data.data,
        pagination: {
          page,
          pageSize,
          total: data.count,
          totalPages: Math.ceil(data.count / pageSize),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const profileController = new ProfileController();

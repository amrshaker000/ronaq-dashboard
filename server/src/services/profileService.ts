import {
  profileRepository,
  settingsRepository,
  notificationRepository,
  activityLogRepository,
} from '../repositories/profileRepository.js';
import { createAppError } from '../middleware/errorHandler.js';
import type { Profile, BusinessSettings, CreateUserDTO } from '../types/index.js';

export class ProfileService {
  // Profiles
  async getAllProfiles(): Promise<Profile[]> {
    return profileRepository.findAll();
  }

  async getProfileById(id: string): Promise<Profile> {
    const profile = await profileRepository.findById(id);
    if (!profile) {
      throw createAppError('المستخدم غير موجود.', 404);
    }
    return profile;
  }

  async updateProfile(id: string, updates: Partial<Profile>, userId: string): Promise<Profile> {
    const existing = await profileRepository.findById(id);
    if (!existing) {
      throw createAppError('المستخدم غير موجود.', 404);
    }

    const profile = await profileRepository.update(id, updates);

    await activityLogRepository.log({
      user_id: userId,
      action: 'update',
      entity_type: 'profile',
      description: `تم تحديث بيانات المستخدم: ${profile.name}`,
    });

    return profile;
  }

  async createUser(dto: CreateUserDTO, userId: string): Promise<Profile> {
    const profile = await profileRepository.createUser(dto);

    await activityLogRepository.log({
      user_id: userId,
      action: 'create',
      entity_type: 'profile',
      description: `تم إنشاء حساب مستخدم جديد: ${profile.name} (${profile.email}) بدور ${profile.role}`,
    });

    return profile;
  }

  async deactivateUser(id: string, userId: string): Promise<void> {
    const existing = await profileRepository.findById(id);
    if (!existing) {
      throw createAppError('المستخدم غير موجود.', 404);
    }

    await profileRepository.deactivate(id);

    await activityLogRepository.log({
      user_id: userId,
      action: 'deactivate',
      entity_type: 'profile',
      description: `تم تعطيل حساب المستخدم: ${existing.name}`,
    });
  }

  async activateUser(id: string, userId: string): Promise<void> {
    const existing = await profileRepository.findById(id);
    if (!existing) {
      throw createAppError('المستخدم غير موجود.', 404);
    }

    await profileRepository.activate(id);

    await activityLogRepository.log({
      user_id: userId,
      action: 'activate',
      entity_type: 'profile',
      description: `تم تفعيل حساب المستخدم: ${existing.name}`,
    });
  }

  // Settings
  async getSettings(): Promise<BusinessSettings> {
    return settingsRepository.get();
  }

  async updateSettings(updates: Partial<BusinessSettings>, userId: string): Promise<BusinessSettings> {
    const settings = await settingsRepository.update(updates, userId);

    await activityLogRepository.log({
      user_id: userId,
      action: 'update',
      entity_type: 'settings',
      description: 'تم تحديث إعدادات النظام',
    });

    return settings;
  }

  // Notifications
  async getNotifications(userId: string, limit?: number) {
    return notificationRepository.findByUser(userId, limit);
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    return notificationRepository.getUnreadCount(userId);
  }

  async markNotificationRead(id: number): Promise<void> {
    await notificationRepository.markAsRead(id);
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await notificationRepository.markAllAsRead(userId);
  }

  // Activity Logs
  async getActivityLogs(page: number = 1, pageSize: number = 20) {
    return activityLogRepository.findAll(page, pageSize);
  }
}

export const profileService = new ProfileService();

import { getAdminClient } from '../config/supabase.js';
import type { Profile, BusinessSettings, CreateUserDTO } from '../types/index.js';

// ============================================
// Profile Repository
// ============================================

export class ProfileRepository {
  private get db() {
    return getAdminClient();
  }

  async findAll(): Promise<Profile[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Profile[]) || [];
  }

  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Profile | null;
  }

  async update(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await this.db
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  }

  async deactivate(id: string): Promise<void> {
    const { error } = await this.db
      .from('profiles')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async activate(id: string): Promise<void> {
    const { error } = await this.db
      .from('profiles')
      .update({ is_active: true, deleted_at: null })
      .eq('id', id);

    if (error) throw error;
  }

  async createUser(dto: CreateUserDTO): Promise<Profile> {
    const supabase = getAdminClient();

    // Create auth user via Supabase Admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        name: dto.name,
        role: dto.role,
      },
    });

    if (authError) throw authError;

    // Profile is auto-created by the trigger; fetch it
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.user.id)
      .single();

    if (profileError) throw profileError;

    if (dto.avatar_url) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: dto.avatar_url })
        .eq('id', authUser.user.id)
        .select('*')
        .single();
      if (updateError) throw updateError;
      return updatedProfile as Profile;
    }

    return profile as Profile;
  }
}

export const profileRepository = new ProfileRepository();

// ============================================
// Settings Repository
// ============================================

export class SettingsRepository {
  private get db() {
    return getAdminClient();
  }

  async get(): Promise<BusinessSettings> {
    const { data, error } = await this.db
      .from('business_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;
    return data as BusinessSettings;
  }

  async update(
    updates: Partial<BusinessSettings>,
    updatedBy: string
  ): Promise<BusinessSettings> {
    const { data, error } = await this.db
      .from('business_settings')
      .update({ ...updates, updated_by: updatedBy })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return data as BusinessSettings;
  }
}

export const settingsRepository = new SettingsRepository();

// ============================================
// Notification Repository
// ============================================

export class NotificationRepository {
  private get db() {
    return getAdminClient();
  }

  async findByUser(userId: string, limit: number = 20) {
    const { data, error } = await this.db
      .from('notifications')
      .select('*')
      .or(`target_user.eq.${userId},target_user.is.null`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or(`target_user.eq.${userId},target_user.is.null`)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  }

  async markAsRead(id: number): Promise<void> {
    const { error } = await this.db
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await this.db
      .from('notifications')
      .update({ is_read: true })
      .or(`target_user.eq.${userId},target_user.is.null`)
      .eq('is_read', false);

    if (error) throw error;
  }

  async create(notification: {
    type: string;
    title: string;
    message: string;
    target_user?: string;
    reference_id?: number;
    reference_type?: string;
  }) {
    const { data, error } = await this.db
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const notificationRepository = new NotificationRepository();

// ============================================
// Activity Log Repository
// ============================================

export class ActivityLogRepository {
  private get db() {
    return getAdminClient();
  }

  async log(entry: {
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id?: number;
    description: string;
    metadata?: Record<string, unknown>;
    ip_address?: string;
  }) {
    const { error } = await this.db.from('activity_logs').insert(entry);
    if (error) {
      // Don't throw — activity logging should never break the main flow
      console.error('Failed to log activity:', error);
    }
  }

  async findAll(page: number = 1, pageSize: number = 20) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.db
      .from('activity_logs')
      .select('*, profiles:user_id(name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }
}

export const activityLogRepository = new ActivityLogRepository();

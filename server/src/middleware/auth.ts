import { Response, NextFunction } from 'express';
import { getAdminClient } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import type { AuthenticatedRequest } from '../types/index.js';

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح. يرجى تسجيل الدخول.',
        data: null,
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صالح.',
        data: null,
      });
      return;
    }

    const supabase = getAdminClient();

    // Verify the JWT token using Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn({ error }, 'Auth token verification failed');
      res.status(401).json({
        success: false,
        message: 'جلسة منتهية. يرجى تسجيل الدخول مرة أخرى.',
        data: null,
      });
      return;
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, role, is_active')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.error({ error: profileError, userId: user.id }, 'Profile not found');
      res.status(403).json({
        success: false,
        message: 'لم يتم العثور على ملف المستخدم.',
        data: null,
      });
      return;
    }

    if (!profile.is_active) {
      res.status(403).json({
        success: false,
        message: 'تم تعطيل هذا الحساب.',
        data: null,
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      name: profile.name,
    };

    next();
  } catch (error) {
    logger.error({ error }, 'Auth middleware error');
    res.status(500).json({
      success: false,
      message: 'خطأ في المصادقة.',
      data: null,
    });
  }
}

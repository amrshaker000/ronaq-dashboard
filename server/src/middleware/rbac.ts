import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, UserRole } from '../types/index.js';

/**
 * Require specific roles to access a route.
 * Must be used after authMiddleware.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح.',
        data: null,
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لهذه الصفحة.',
        data: null,
      });
      return;
    }

    next();
  };
}

/**
 * Admin-only access shorthand
 */
export const adminOnly = requireRole('admin');

/**
 * Both admin and employee can access
 */
export const authenticated = requireRole('admin', 'employee');

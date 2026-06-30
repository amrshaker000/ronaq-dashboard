import { Router } from 'express';
import { profileController } from '../controllers/profileController.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly, authenticated } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  updateSettingsSchema,
  createUserSchema,
} from '../validators/schemas.js';

const router = Router();

// Apply auth middleware to all profile/user/settings routes
router.use(authMiddleware);

// --- Notifications (Authenticated) ---
router.get('/notifications', authenticated, profileController.getNotifications);
router.post('/notifications/read-all', authenticated, profileController.markAllNotificationsRead);
router.put('/notifications/:id/read', authenticated, profileController.markNotificationRead);

// --- Current User Profile (Authenticated) ---
router.get('/me', authenticated, profileController.getMe);

// --- Settings (Read by authenticated, update by admin) ---
router.get('/settings', authenticated, profileController.getSettings);
router.put('/settings', adminOnly, validate(updateSettingsSchema, 'body'), profileController.updateSettings);

// --- Activity Logs (Admin Only) ---
router.get('/activity-logs', adminOnly, profileController.getActivityLogs);

// --- User Management (Admin Only) ---
router.get('/users', adminOnly, profileController.getAllProfiles);
router.get('/users/:id', adminOnly, profileController.getProfileById);
router.post('/users', adminOnly, validate(createUserSchema, 'body'), profileController.createUser);
router.put('/users/:id', adminOnly, profileController.updateProfile);
router.post('/users/:id/deactivate', adminOnly, profileController.deactivateUser);
router.post('/users/:id/activate', adminOnly, profileController.activateUser);

export default router;

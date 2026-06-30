import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly, authenticated } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { analyticsDateRangeSchema } from '../validators/schemas.js';

const router = Router();

// Apply auth middleware to all analytics routes
router.use(authMiddleware);

// Get dashboard metrics (both admin & employee can access, employee gets sanitized results)
router.get('/dashboard', authenticated, analyticsController.getDashboard);

// Get detailed reports (admin only)
router.get(
  '/reports',
  adminOnly,
  validate(analyticsDateRangeSchema, 'query'),
  analyticsController.getReports
);

// Get P&L financial summary (admin only)
router.get(
  '/financials',
  adminOnly,
  validate(analyticsDateRangeSchema, 'query'),
  analyticsController.getFinancials
);

export default router;

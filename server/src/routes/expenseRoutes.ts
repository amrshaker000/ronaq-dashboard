import { Router } from 'express';
import { expenseController } from '../controllers/expenseController.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseFiltersSchema,
  idParamSchema,
} from '../validators/schemas.js';

const router = Router();

// Apply auth + adminOnly to all expense routes
router.use(authMiddleware);
router.use(adminOnly);

// Get all expenses (with filters)
router.get('/', validate(expenseFiltersSchema, 'query'), expenseController.getAll);

// Get single expense
router.get('/:id', validate(idParamSchema, 'params'), expenseController.getById);

// Create a new expense
router.post('/', validate(createExpenseSchema, 'body'), expenseController.create);

// Update expense
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateExpenseSchema, 'body'),
  expenseController.update
);

// Delete expense (soft delete)
router.delete('/:id', validate(idParamSchema, 'params'), expenseController.delete);

export default router;

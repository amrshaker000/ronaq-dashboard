import { Router } from 'express';
import { orderController } from '../controllers/orderController.js';
import { authMiddleware } from '../middleware/auth.js';
import { authenticated } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  updateOrderDetailsSchema,
  orderFiltersSchema,
  idParamSchema,
} from '../validators/schemas.js';

const router = Router();

// Apply auth middleware to all order routes
router.use(authMiddleware);

// Get recent orders
router.get('/recent', authenticated, orderController.getRecent);

// Get all orders (with filters)
router.get(
  '/',
  authenticated,
  validate(orderFiltersSchema, 'query'),
  orderController.getAll
);

// Get order details (including items and timeline logs)
router.get('/:id', authenticated, validate(idParamSchema, 'params'), orderController.getById);

// Create a new order
router.post('/', authenticated, validate(createOrderSchema, 'body'), orderController.create);

// Update order status
router.put(
  '/:id/status',
  authenticated,
  validate(idParamSchema, 'params'),
  validate(updateOrderStatusSchema, 'body'),
  orderController.updateStatus
);

// Update order details (customer info, shipping, discount, payment)
router.put(
  '/:id/details',
  authenticated,
  validate(idParamSchema, 'params'),
  validate(updateOrderDetailsSchema, 'body'),
  orderController.updateDetails
);

// Cancel order
router.post('/:id/cancel', authenticated, validate(idParamSchema, 'params'), orderController.cancel);

export default router;

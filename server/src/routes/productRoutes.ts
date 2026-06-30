import { Router } from 'express';
import { productController } from '../controllers/productController.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly, authenticated } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createProductSchema,
  updateProductSchema,
  stockAdjustmentSchema,
  receiveShipmentSchema,
  productFiltersSchema,
  movementFiltersSchema,
  idParamSchema,
} from '../validators/schemas.js';

const router = Router();

// Apply auth middleware to all product routes
router.use(authMiddleware);

// Get stock movements list (authenticated)
router.get(
  '/movements',
  authenticated,
  validate(movementFiltersSchema, 'query'),
  productController.getMovements
);

// Get low stock list (authenticated)
router.get('/low-stock', authenticated, productController.getLowStock);

// Get all products (authenticated)
router.get(
  '/',
  authenticated,
  validate(productFiltersSchema, 'query'),
  productController.getAll
);

// Get single product (authenticated)
router.get('/:id', authenticated, validate(idParamSchema, 'params'), productController.getById);

// Get product stock history (authenticated)
router.get(
  '/:id/stock-history',
  authenticated,
  validate(idParamSchema, 'params'),
  productController.getStockHistory
);

// Create product (admin only)
router.post(
  '/',
  adminOnly,
  validate(createProductSchema, 'body'),
  productController.create
);

// Update product (admin only)
router.put(
  '/:id',
  adminOnly,
  validate(idParamSchema, 'params'),
  validate(updateProductSchema, 'body'),
  productController.update
);

// Delete product (admin only)
router.delete(
  '/:id',
  adminOnly,
  validate(idParamSchema, 'params'),
  productController.delete
);

// Adjust stock manually (admin only)
router.post(
  '/adjust-stock',
  adminOnly,
  validate(stockAdjustmentSchema, 'body'),
  productController.adjustStock
);

// Receive new shipment (admin only)
router.post(
  '/receive-shipment',
  adminOnly,
  validate(receiveShipmentSchema, 'body'),
  productController.receiveShipment
);

export default router;

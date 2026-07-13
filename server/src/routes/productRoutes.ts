import { Router } from 'express';
import { productController } from '../controllers/productController.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly, authenticated } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createProductSchema,
  updateProductSchema,
  productFiltersSchema,
  idParamSchema,
} from '../validators/schemas.js';

const router = Router();

// Apply auth middleware to all product routes
router.use(authMiddleware);



// Get all products (authenticated)
router.get(
  '/',
  authenticated,
  validate(productFiltersSchema, 'query'),
  productController.getAll
);

// Get single product (authenticated)
router.get('/:id', authenticated, validate(idParamSchema, 'params'), productController.getById);



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



export default router;

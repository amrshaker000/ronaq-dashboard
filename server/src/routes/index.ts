import { Router } from 'express';
import productRoutes from './productRoutes.js';
import orderRoutes from './orderRoutes.js';
import expenseRoutes from './expenseRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import profileRoutes from './profileRoutes.js';
import publicRoutes from './publicRoutes.js';

const router = Router();

// API Health Check
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'خادم نظام رونق يعمل بشكل سليم',
    timestamp: new Date().toISOString(),
  });
});

// Route mounting
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/expenses', expenseRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/system', profileRoutes);
router.use('/public', publicRoutes);

export default router;

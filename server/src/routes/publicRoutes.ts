import { Router, Request, Response, NextFunction } from 'express';
import { productService } from '../services/productService.js';
import { orderService } from '../services/orderService.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema } from '../validators/schemas.js';

const router = Router();

// 1. Public route to fetch all active products for the shop page
router.get('/products', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Return a large number of products to show the whole catalog at once
    const data = await productService.getAll({
      page: 1,
      pageSize: 10000,
    });
    
    // Filter to only active, in-stock products for the public store
    const activeProducts = data.products.filter((p) => p.is_active);

    res.status(200).json({
      success: true,
      message: 'تم جلب منتجات المتجر بنجاح',
      data: activeProducts,
    });
  } catch (error) {
    next(error);
  }
});

// 2. Public route to create a new order (without authentication)
router.post('/orders', validate(createOrderSchema, 'body'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Set all pricing and financial calculations to 0 for priceless ordering
    const orderPayload = {
      ...req.body,
      discount: 0,
      shipping_cost: 0,
    };
    
    // Pass null as the userId to signify it's a public order
    const order = await orderService.create(orderPayload, null as any);
    
    res.status(201).json({
      success: true,
      message: 'تم تسجيل طلبك بنجاح',
      data: {
        order_number: order.order_number,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 3. Public route to track an order by its unique tracking code
router.get('/orders/track/:orderNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderNumber = req.params['orderNumber'] as string;
    
    // Strict format check: Must start with RNQ
    if (!orderNumber.startsWith('RNQ')) {
      return res.status(400).json({
        success: false,
        message: 'خطأ في رقم التتبع',
      });
    }

    const orderDetails = await orderService.getByOrderNumber(orderNumber);
    
    if (!orderDetails) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود. يرجى التأكد من الرمز المدخل.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'تم جلب تفاصيل التتبع بنجاح',
      data: {
        order_number: orderDetails.order_number,
        customer_name: orderDetails.customer_name,
        customer_phone: orderDetails.customer_phone,
        customer_governorate: orderDetails.customer_governorate,
        customer_address: orderDetails.customer_address,
        status: orderDetails.status,
        shipping_company: orderDetails.shipping_company,
        tracking_number: orderDetails.tracking_number,
        notes: orderDetails.notes,
        created_at: orderDetails.created_at,
        items: orderDetails.items,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

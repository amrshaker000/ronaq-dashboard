import { Response, NextFunction } from 'express';
import { orderService } from '../services/orderService.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class OrderController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = (req as any).validatedQuery;
      const data = await orderService.getAll(filters);
      res.status(200).json({
        success: true,
        message: 'تم جلب الطلبات بنجاح',
        data: data.orders,
        pagination: data.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await orderService.getById(Number(id));
      res.status(200).json({
        success: true,
        message: 'تم جلب تفاصيل الطلب بنجاح',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.create(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: 'تم إنشاء الطلب بنجاح',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const order = await orderService.updateStatus(Number(id), req.body, req.user!.id);
      res.status(200).json({
        success: true,
        message: 'تم تحديث حالة الطلب بنجاح',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const order = await orderService.updateStatus(
        Number(id),
        { status: 'cancelled', notes: 'تم إلغاء الطلب من قبل المستخدم' },
        req.user!.id
      );
      res.status(200).json({
        success: true,
        message: 'تم إلغاء الطلب بنجاح',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query['limit'] ? Number(req.query['limit']) : 10;
      const orders = await orderService.getRecentOrders(limit);
      res.status(200).json({
        success: true,
        message: 'تم جلب الطلبات الأخيرة بنجاح',
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();

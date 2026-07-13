import { Response, NextFunction } from 'express';
import { productService } from '../services/productService.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class ProductController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = (req as any).validatedQuery;
      const data = await productService.getAll(filters);
      res.status(200).json({
        success: true,
        message: 'تم جلب المنتجات بنجاح',
        data: data.products,
        pagination: data.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const product = await productService.getById(Number(id));
      res.status(200).json({
        success: true,
        message: 'تم جلب المنتج بنجاح',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.create(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: 'تم إنشاء المنتج بنجاح',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const product = await productService.update(Number(id), req.body, req.user!.id);
      res.status(200).json({
        success: true,
        message: 'تم تحديث المنتج بنجاح',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await productService.delete(Number(id), req.user!.id);
      res.status(200).json({
        success: true,
        message: 'تم حذف المنتج بنجاح',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

}

export const productController = new ProductController();

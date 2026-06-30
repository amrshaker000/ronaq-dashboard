import { Response, NextFunction } from 'express';
import { expenseService } from '../services/expenseService.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class ExpenseController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = (req as any).validatedQuery;
      const data = await expenseService.getAll(filters);
      res.status(200).json({
        success: true,
        message: 'تم جلب المصاريف بنجاح',
        data: data.expenses,
        pagination: data.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const expense = await expenseService.getById(Number(id));
      res.status(200).json({
        success: true,
        message: 'تم جلب المصروف بنجاح',
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.create(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: 'تم تسجيل المصروف بنجاح',
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const expense = await expenseService.update(Number(id), req.body, req.user!.id);
      res.status(200).json({
        success: true,
        message: 'تم تحديث المصروف بنجاح',
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await expenseService.delete(Number(id), req.user!.id);
      res.status(200).json({
        success: true,
        message: 'تم حذف المصروف بنجاح',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const expenseController = new ExpenseController();

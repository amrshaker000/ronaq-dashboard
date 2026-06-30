import { Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class AnalyticsController {
  async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await analyticsService.getDashboardMetrics();
      
      // Security check: employee cannot view revenue details
      if (req.user?.role === 'employee') {
        metrics.todayRevenue = 0;
      }

      res.status(200).json({
        success: true,
        message: 'تم جلب مؤشرات لوحة القيادة بنجاح',
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  async getReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = (req as any).validatedQuery || req.query;
      const data = await analyticsService.getAnalytics({
        from: filters.from as string,
        to: filters.to as string,
      });
      res.status(200).json({
        success: true,
        message: 'تم جلب التحليلات والتقارير بنجاح',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFinancials(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = (req as any).validatedQuery || req.query;
      const data = await analyticsService.getFinancialSummary(
        filters.from as string,
        filters.to as string
      );
      res.status(200).json({
        success: true,
        message: 'تم جلب التقرير المالي بنجاح',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();

import { analyticsRepository } from '../repositories/analyticsRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { expenseRepository } from '../repositories/expenseRepository.js';
import type { AnalyticsDateRange } from '../types/index.js';

export class AnalyticsService {
  async getDashboardMetrics() {
    const [
      todayRevenue,
      activeOrders,
      totalProducts,
      todayOrders,
      statusCounts,
    ] = await Promise.all([
      orderRepository.getTodayRevenue(),
      orderRepository.getActiveOrdersCount(),
      productRepository.countAll(),
      orderRepository.getTodayOrdersCount(),
      orderRepository.countByStatus(),
    ]);

    return {
      todayRevenue,
      activeOrders,
      totalProducts,
      todayOrders,
      statusCounts,
    };
  }

  async getAnalytics(range: AnalyticsDateRange) {
    const [
      revenueData,
      ordersByStatus,
      topProducts,
      salesByGovernorate,
      averageOrderValue,
      topCustomers,
      monthlyGrowth,
      repeatCustomers,
      averageFulfillmentTime,
      pendingShipments,
    ] = await Promise.all([
      analyticsRepository.getRevenueByDateRange(range),
      analyticsRepository.getOrdersByStatus(range),
      analyticsRepository.getTopSellingProducts(range),
      analyticsRepository.getSalesByGovernorate(range),
      analyticsRepository.getAverageOrderValue(range),
      analyticsRepository.getTopCustomers(range),
      analyticsRepository.getMonthlyGrowth(range),
      analyticsRepository.getRepeatCustomers(range),
      analyticsRepository.getAverageFulfillmentTime(range),
      analyticsRepository.getPendingShipmentsCount(),
    ]);

    // Group revenue by day for chart
    const revenueByDay: Record<string, number> = {};
    revenueData.forEach((r: any) => {
      const item = r as { total: number; created_at: string };
      const day = item.created_at.split('T')[0]!;
      revenueByDay[day] = (revenueByDay[day] || 0) + Number(item.total);
    });

    return {
      revenueByDay,
      ordersByStatus,
      topProducts,
      salesByGovernorate,
      averageOrderValue,
      topCustomers,
      monthlyGrowth,
      repeatCustomers,
      averageFulfillmentTime,
      pendingShipments,
    };
  }

  async getFinancialSummary(from: string, to: string) {
    const [totalExpenses, expensesByCategory, revenueData] = await Promise.all([
      expenseRepository.getTotalByDateRange(from, to),
      expenseRepository.getByCategory(from, to),
      analyticsRepository.getRevenueByDateRange({ from, to }),
    ]);

    const totalRevenue = revenueData.reduce(
      (sum, r) => sum + Number((r as { total: number }).total),
      0
    );

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      expensesByCategory,
    };
  }
}

export const analyticsService = new AnalyticsService();
